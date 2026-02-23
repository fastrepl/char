use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{Mutex, RwLock, broadcast};

use super::error::GoTrueError;
use super::storage::AuthStorage;
use super::types::{AuthChangeEvent, GoTrueErrorBody, Session, SignOutScope, User};

const AUTO_REFRESH_TICK_DURATION_MS: u64 = 30_000;
const AUTO_REFRESH_TICK_THRESHOLD: i64 = 3;
const EXPIRY_MARGIN_MS: i64 = AUTO_REFRESH_TICK_THRESHOLD * AUTO_REFRESH_TICK_DURATION_MS as i64;

pub struct GoTrueClientConfig<S: AuthStorage> {
    pub url: String,
    pub api_key: String,
    pub storage_key: String,
    pub storage: S,
    pub auto_refresh_token: bool,
}

struct AutoRefreshState {
    handle: Option<tokio::task::JoinHandle<()>>,
    cancel: Option<tokio::sync::watch::Sender<bool>>,
}

struct Inner<S: AuthStorage> {
    url: String,
    api_key: String,
    storage_key: String,
    storage: S,
    auto_refresh_token: bool,
    http_client: reqwest::Client,
    event_tx: broadcast::Sender<(AuthChangeEvent, Option<Session>)>,
    auto_refresh: Mutex<AutoRefreshState>,
    refresh_lock: Mutex<()>,
}

pub struct GoTrueClient<S: AuthStorage> {
    inner: Arc<Inner<S>>,
}

impl<S: AuthStorage> Clone for GoTrueClient<S> {
    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
        }
    }
}

impl<S: AuthStorage> GoTrueClient<S> {
    pub fn new(config: GoTrueClientConfig<S>) -> Self {
        let (event_tx, _) = broadcast::channel(64);

        let inner = Inner {
            url: config.url.trim_end_matches('/').to_string(),
            api_key: config.api_key,
            storage_key: config.storage_key,
            storage: config.storage,
            auto_refresh_token: config.auto_refresh_token,
            http_client: reqwest::Client::new(),
            event_tx,
            auto_refresh: Mutex::new(AutoRefreshState {
                handle: None,
                cancel: None,
            }),
            refresh_lock: Mutex::new(()),
        };

        Self {
            inner: Arc::new(inner),
        }
    }

    pub async fn get_session(&self) -> Result<Option<Session>, GoTrueError> {
        load_session(&self.inner.storage, &self.inner.storage_key)
    }

    /// If the access token is expired, it will be refreshed using the refresh token.
    /// If still valid, user info is fetched and a full session is stored.
    pub async fn set_session(
        &self,
        access_token: &str,
        refresh_token: &str,
    ) -> Result<Session, GoTrueError> {
        if access_token.is_empty() || refresh_token.is_empty() {
            return Err(GoTrueError::SessionMissing);
        }

        let now = chrono::Utc::now().timestamp();
        let has_expired = decode_jwt_exp(access_token)
            .map(|exp| exp <= now)
            .unwrap_or(true);

        if has_expired {
            return self.call_refresh_token(refresh_token).await;
        }

        let user = self.get_user(access_token).await?;
        let expires_at = decode_jwt_exp(access_token);
        let expires_in = expires_at.map(|exp| exp - now).unwrap_or(0);

        let session = Session {
            access_token: access_token.to_string(),
            refresh_token: refresh_token.to_string(),
            expires_in,
            expires_at,
            token_type: "bearer".to_string(),
            user,
        };

        save_session(&self.inner.storage, &self.inner.storage_key, &session)?;
        let _ = self
            .inner
            .event_tx
            .send((AuthChangeEvent::SignedIn, Some(session.clone())));

        Ok(session)
    }

    pub async fn refresh_session(&self) -> Result<Session, GoTrueError> {
        let refresh_token = load_session(&self.inner.storage, &self.inner.storage_key)?
            .map(|s| s.refresh_token)
            .ok_or(GoTrueError::SessionMissing)?;

        self.call_refresh_token(&refresh_token).await
    }

    /// `Local`: clears local session without server-side revocation.
    /// `Global`: revokes all sessions server-side, then clears local session.
    /// `Others`: revokes other sessions server-side but keeps the current local session.
    pub async fn sign_out(&self, scope: SignOutScope) -> Result<(), GoTrueError> {
        if scope != SignOutScope::Local {
            let access_token =
                load_session(&self.inner.storage, &self.inner.storage_key)?.map(|s| s.access_token);

            if let Some(token) = access_token {
                if let Err(e) = self.api_sign_out(&token, scope).await {
                    if !e.is_ignorable_signout_error() {
                        return Err(e);
                    }
                }
            }
        }

        if scope != SignOutScope::Others {
            remove_session(&self.inner.storage, &self.inner.storage_key)?;
            let _ = self.inner.event_tx.send((AuthChangeEvent::SignedOut, None));
        }

        Ok(())
    }

    pub fn on_auth_state_change(&self) -> broadcast::Receiver<(AuthChangeEvent, Option<Session>)> {
        self.inner.event_tx.subscribe()
    }

    pub async fn start_auto_refresh(&self) {
        self.stop_auto_refresh().await;

        let (cancel_tx, cancel_rx) = tokio::sync::watch::channel(false);
        let client = self.clone();

        let handle = tokio::spawn(async move {
            auto_refresh_loop(client, cancel_rx).await;
        });

        let mut state = self.inner.auto_refresh.lock().await;
        state.handle = Some(handle);
        state.cancel = Some(cancel_tx);
    }

    pub async fn stop_auto_refresh(&self) {
        let mut state = self.inner.auto_refresh.lock().await;

        if let Some(cancel_tx) = state.cancel.take() {
            let _ = cancel_tx.send(true);
        }
        if let Some(handle) = state.handle.take() {
            handle.abort();
        }
    }

    /// Load session from storage, emit INITIAL_SESSION, and optionally start auto-refresh.
    pub async fn initialize(&self) -> Result<Option<Session>, GoTrueError> {
        let session = self.recover_and_refresh().await?;

        let _ = self
            .inner
            .event_tx
            .send((AuthChangeEvent::InitialSession, session.clone()));

        if self.inner.auto_refresh_token {
            self.start_auto_refresh().await;
        }

        Ok(session)
    }

    pub fn get_url_for_provider(
        &self,
        provider: &str,
        redirect_to: Option<&str>,
        scopes: Option<&str>,
    ) -> String {
        let inner = self.inner.read().await;

        let mut params = vec![format!("provider={}", urlencoding::encode(provider))];

        if let Some(redirect) = redirect_to {
            params.push(format!("redirect_to={}", urlencoding::encode(redirect)));
        }

        if let Some(scopes) = scopes {
            params.push(format!("scopes={}", urlencoding::encode(scopes)));
        }

        format!("{}/authorize?{}", self.inner.url, params.join("&"))
    }

    async fn call_refresh_token(&self, refresh_token: &str) -> Result<Session, GoTrueError> {
        if refresh_token.is_empty() {
            return Err(GoTrueError::SessionMissing);
        }

        let _guard = self.inner.refresh_lock.lock().await;

        // Another concurrent call may have already refreshed the token. If the
        // stored refresh token differs from what we were given, that call won the
        // race and its result is now in storage -- return it instead of making a
        // duplicate request that would invalidate the new rotating token.
        if let Ok(Some(current)) = load_session(&self.inner.storage, &self.inner.storage_key) {
            if current.refresh_token != refresh_token {
                return Ok(current);
            }
        }

        match self.refresh_access_token(refresh_token).await {
            Ok(session) => {
                save_session(&self.inner.storage, &self.inner.storage_key, &session)?;
                let _ = self
                    .inner
                    .event_tx
                    .send((AuthChangeEvent::TokenRefreshed, Some(session.clone())));
                Ok(session)
            }
            Err(e) => {
                if !e.is_retryable() {
                    let _ = remove_session(&self.inner.storage, &self.inner.storage_key);
                    let _ = self.inner.event_tx.send((AuthChangeEvent::SignedOut, None));
                }
                Err(e)
            }
        }
    }

    async fn refresh_access_token(&self, refresh_token: &str) -> Result<Session, GoTrueError> {
        let started_at = std::time::Instant::now();

        for attempt in 0..3u32 {
            if attempt > 0 {
                let backoff = Duration::from_millis(200 * 2u64.pow(attempt - 1));
                tokio::time::sleep(backoff).await;
            }

            match self.api_refresh_token(refresh_token).await {
                Ok(session) => return Ok(session),
                Err(e) => {
                    if !e.is_retryable() {
                        return Err(e);
                    }
                    let next_backoff_ms = 200 * 2u64.pow(attempt);
                    let elapsed = started_at.elapsed().as_millis() as u64;
                    if elapsed + next_backoff_ms >= AUTO_REFRESH_TICK_DURATION_MS {
                        return Err(e);
                    }
                }
            }
        }

        Err(GoTrueError::RetryableFetchError(
            "max retries exceeded".to_string(),
        ))
    }

    fn request(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.inner
            .http_client
            .request(method, format!("{}{}", self.inner.url, path))
            .header("apikey", &self.inner.api_key)
    }

    async fn api_refresh_token(&self, refresh_token: &str) -> Result<Session, GoTrueError> {
        let response = self
            .request(reqwest::Method::POST, "/token?grant_type=refresh_token")
            .bearer_auth(&self.inner.api_key)
            .json(&serde_json::json!({ "refresh_token": refresh_token }))
            .send()
            .await
            .map_err(|e| GoTrueError::RetryableFetchError(e.to_string()))?;

        if !response.status().is_success() {
            let body: GoTrueErrorBody = response.json().await.unwrap_or_else(|_| GoTrueErrorBody {
                error: Some("Unknown error".to_string()),
                error_description: None,
                code: None,
                msg: None,
                message: None,
            });
            return Err(GoTrueError::from_api_response(status, body));
        }

        let session: Session = response.json().await?;
        Ok(normalize_session(session))
    }

    async fn get_user(&self, access_token: &str) -> Result<User, GoTrueError> {
        let response = self
            .request(reqwest::Method::GET, "/user")
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| GoTrueError::RetryableFetchError(e.to_string()))?;

        if !response.status().is_success() {
            let body: GoTrueErrorBody = response.json().await.unwrap_or_else(|_| GoTrueErrorBody {
                error: Some("Unknown error".to_string()),
                error_description: None,
                code: None,
                msg: None,
                message: None,
            });
            return Err(GoTrueError::from_api_response(status, body));
        }

        Ok(response.json().await?)
    }

    async fn api_sign_out(
        &self,
        access_token: &str,
        scope: SignOutScope,
    ) -> Result<(), GoTrueError> {
        let scope_str = match scope {
            SignOutScope::Global => "global",
            SignOutScope::Local => "local",
            SignOutScope::Others => "others",
        };

        let response = self
            .request(reqwest::Method::POST, "/logout")
            .bearer_auth(access_token)
            .json(&serde_json::json!({ "scope": scope_str }))
            .send()
            .await
            .map_err(|e| GoTrueError::RetryableFetchError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body: GoTrueErrorBody = response.json().await.unwrap_or_else(|_| GoTrueErrorBody {
                error: Some("Unknown error".to_string()),
                error_description: None,
                code: None,
                msg: None,
                message: None,
            });
            return Err(GoTrueError::from_api_response(status, body));
        }

        Ok(())
    }

    async fn recover_and_refresh(&self) -> Result<Option<Session>, GoTrueError> {
        let session = load_session(&self.inner.storage, &self.inner.storage_key)?;

        let Some(session) = session else {
            return Ok(None);
        };

        if !is_valid_session(&session) {
            remove_session(&self.inner.storage, &self.inner.storage_key)?;
            return Ok(None);
        }

        let now_ms = chrono::Utc::now().timestamp_millis();
        let expires_with_margin = match session.expires_at {
            Some(exp) => (exp * 1000 - now_ms) < EXPIRY_MARGIN_MS,
            None => true,
        };

        if expires_with_margin && !session.refresh_token.is_empty() {
            let refreshed = self.call_refresh_token(&session.refresh_token).await?;
            return Ok(Some(refreshed));
        }

        let _ = self
            .inner
            .event_tx
            .send((AuthChangeEvent::SignedIn, Some(session.clone())));
        Ok(Some(session))
    }
}

async fn auto_refresh_loop<S: AuthStorage>(
    client: GoTrueClient<S>,
    mut cancel_rx: tokio::sync::watch::Receiver<bool>,
) {
    auto_refresh_tick(&client).await;

    loop {
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_millis(AUTO_REFRESH_TICK_DURATION_MS)) => {
                auto_refresh_tick(&client).await;
            }
            _ = cancel_rx.changed() => {
                break;
            }
        }
    }
}

async fn auto_refresh_tick<S: AuthStorage>(client: &GoTrueClient<S>) {
    let session = match load_session(&client.inner.storage, &client.inner.storage_key) {
        Ok(Some(s)) => s,
        _ => return,
    };

    if session.refresh_token.is_empty() {
        return;
    }

    let Some(expires_at) = session.expires_at else {
        return;
    };

    let now = chrono::Utc::now().timestamp_millis();
    let expires_in_ticks = (expires_at * 1000 - now) / AUTO_REFRESH_TICK_DURATION_MS as i64;

    if expires_in_ticks <= AUTO_REFRESH_TICK_THRESHOLD {
        if let Err(e) = client.call_refresh_token(&session.refresh_token).await {
            if e.is_retryable() {
                eprintln!("[auth] auto-refresh transient error (will retry): {e}");
            } else {
                eprintln!("[auth] auto-refresh error, session cleared: {e}");
            }
        }
    }
}

async fn parse_error_response(response: reqwest::Response) -> GoTrueError {
    let status = response.status().as_u16();
    let body: GoTrueErrorBody = response.json().await.unwrap_or_else(|_| GoTrueErrorBody {
        error: Some("Unknown error".to_string()),
        error_description: None,
        code: None,
        msg: None,
        message: None,
    });
    GoTrueError::from_api_response(status, body)
}

fn normalize_session(mut session: Session) -> Session {
    if session.expires_at.is_none() && session.expires_in > 0 {
        session.expires_at = Some(chrono::Utc::now().timestamp() + session.expires_in);
    }
    session
}

fn decode_jwt_exp(token: &str) -> Option<i64> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }

    use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
    let payload = URL_SAFE_NO_PAD.decode(parts[1]).ok()?;
    let claims: serde_json::Value = serde_json::from_slice(&payload).ok()?;
    claims.get("exp")?.as_i64()
}

fn is_valid_session(session: &Session) -> bool {
    !session.access_token.is_empty()
        && !session.refresh_token.is_empty()
        && session.expires_at.is_some()
}

fn load_session<S: AuthStorage>(
    storage: &S,
    storage_key: &str,
) -> Result<Option<Session>, GoTrueError> {
    let data = storage
        .get_item(storage_key)
        .map_err(GoTrueError::StorageError)?;

    match data {
        Some(json_str) => {
            let session: Session =
                serde_json::from_str(&json_str).map_err(GoTrueError::JsonError)?;
            Ok(Some(session))
        }
        None => Ok(None),
    }
}

fn save_session<S: AuthStorage>(
    storage: &S,
    storage_key: &str,
    session: &Session,
) -> Result<(), GoTrueError> {
    let json_str = serde_json::to_string(session).map_err(GoTrueError::JsonError)?;
    storage
        .set_item(storage_key, &json_str)
        .map_err(GoTrueError::StorageError)?;
    Ok(())
}

fn remove_session<S: AuthStorage>(storage: &S, storage_key: &str) -> Result<(), GoTrueError> {
    storage
        .remove_item(storage_key)
        .map_err(GoTrueError::StorageError)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gotrue::storage::MemoryStorage;

    fn test_user() -> User {
        User {
            id: "user-1".to_string(),
            email: None,
            phone: None,
            created_at: None,
            updated_at: None,
            user_metadata: Default::default(),
            app_metadata: Default::default(),
        }
    }

    fn test_session() -> Session {
        Session {
            access_token: "at".to_string(),
            refresh_token: "rt".to_string(),
            expires_in: 3600,
            expires_at: Some(1700003600),
            token_type: "bearer".to_string(),
            user: test_user(),
        }
    }

    fn make_test_config() -> GoTrueClientConfig<MemoryStorage> {
        GoTrueClientConfig {
            url: "https://example.supabase.co/auth/v1".to_string(),
            api_key: "test-anon-key".to_string(),
            storage_key: "sb-test-auth-token".to_string(),
            storage: MemoryStorage::new(),
            auto_refresh_token: false,
        }
    }

    fn make_test_jwt(claims_json: &str) -> String {
        use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
        let header = URL_SAFE_NO_PAD.encode(r#"{"alg":"HS256","typ":"JWT"}"#);
        let payload = URL_SAFE_NO_PAD.encode(claims_json);
        format!("{header}.{payload}.sig")
    }

    #[test]
    fn test_decode_jwt_exp() {
        use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};

        let header = URL_SAFE_NO_PAD.encode(r#"{"alg":"HS256","typ":"JWT"}"#);
        let payload = URL_SAFE_NO_PAD.encode(r#"{"sub":"user-1","exp":1700000000}"#);
        let token = format!("{}.{}.sig", header, payload);

        assert_eq!(decode_jwt_exp(&token), Some(1700000000));
    }

    #[test]
    fn test_decode_jwt_exp_no_exp() {
        use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};

        let header = URL_SAFE_NO_PAD.encode(r#"{"alg":"HS256","typ":"JWT"}"#);
        let payload = URL_SAFE_NO_PAD.encode(r#"{"sub":"user-1"}"#);
        let token = format!("{}.{}.sig", header, payload);

        assert_eq!(decode_jwt_exp(&token), None);
    }

    #[test]
    fn test_decode_jwt_exp_invalid() {
        assert_eq!(decode_jwt_exp("invalid"), None);
        assert_eq!(decode_jwt_exp("a.b"), None);
    }

    #[test]
    fn test_is_valid_session() {
        assert!(is_valid_session(&test_session()));
    }

    #[test]
    fn test_is_valid_session_missing_fields() {
        let session = Session {
            access_token: "".to_string(),
            ..test_session()
        };
        assert!(!is_valid_session(&session));

        let session = Session {
            refresh_token: "".to_string(),
            ..test_session()
        };
        assert!(!is_valid_session(&session));

        let session = Session {
            expires_at: None,
            ..test_session()
        };
        assert!(!is_valid_session(&session));
    }

    #[test]
    fn test_session_storage_roundtrip() {
        let storage = MemoryStorage::new();
        let key = "test-key";

        let session = Session {
            user: User {
                email: Some("test@example.com".to_string()),
                ..test_user()
            },
            ..test_session()
        };

        save_session(&storage, key, &session).unwrap();
        let loaded = load_session(&storage, key).unwrap().unwrap();

        assert_eq!(loaded.access_token, "at");
        assert_eq!(loaded.refresh_token, "rt");
        assert_eq!(loaded.user.id, "user-1");
        assert_eq!(loaded.user.email, Some("test@example.com".to_string()));
    }

    #[test]
    fn test_load_missing_session() {
        let storage = MemoryStorage::new();
        assert!(load_session(&storage, "nonexistent").unwrap().is_none());
    }

    #[test]
    fn test_remove_session() {
        let storage = MemoryStorage::new();
        let key = "test-key";

        save_session(&storage, key, &test_session()).unwrap();
        assert!(load_session(&storage, key).unwrap().is_some());

        remove_session(&storage, key).unwrap();
        assert!(load_session(&storage, key).unwrap().is_none());
    }

    #[tokio::test]
    async fn test_get_session_empty() {
        let client = GoTrueClient::new(make_test_config());
        assert!(client.get_session().await.unwrap().is_none());
    }

    // Verifies the re-read-after-acquire guard in call_refresh_token: if another
    // concurrent call already refreshed the token and stored a new session, the
    // late caller returns the stored result rather than making a duplicate HTTP
    // request (which would invalidate the new rotating token on the server).
    #[tokio::test]
    async fn test_call_refresh_token_dedup_via_storage() {
        let config = make_test_config();
        let storage = config.storage.clone();
        let storage_key = config.storage_key.clone();
        let client = GoTrueClient::new(config);

        let old_refresh = "old-refresh-token";
        let new_refresh = "new-refresh-token";

        let updated_session = Session {
            refresh_token: new_refresh.to_string(),
            ..test_session()
        };
        save_session(&storage, &storage_key, &updated_session).unwrap();

        // Calling with the old refresh token: the guard sees the stored token
        // has already changed, so it returns the stored session without any
        // network call (which would fail since there is no real HTTP server).
        let result = client.call_refresh_token(old_refresh).await.unwrap();
        assert_eq!(result.refresh_token, new_refresh);
    }

    #[test]
    fn test_gotrue_error_is_fatal() {
        assert!(GoTrueError::SessionMissing.is_fatal_session_error());

        let fatal_codes = ["refresh_token_not_found", "refresh_token_already_used"];
        for code in fatal_codes {
            let err = GoTrueError::ApiError {
                status: 400,
                message: "error".to_string(),
                code: Some(code.to_string()),
            };
            assert!(err.is_fatal_session_error());
        }

        let err = GoTrueError::ApiError {
            status: 400,
            message: "error".to_string(),
            code: Some("other_code".to_string()),
        };
        assert!(!err.is_fatal_session_error());
    }

    #[test]
    fn test_gotrue_error_is_retryable() {
        assert!(GoTrueError::RetryableFetchError("timeout".to_string()).is_retryable());
        assert!(!GoTrueError::SessionMissing.is_retryable());
    }
}
