use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{broadcast, Mutex, RwLock};

use super::error::GoTrueError;
use super::storage::AuthStorage;
use super::types::{AuthChangeEvent, GoTrueErrorBody, Session, SignOutScope, User};

/// How often the auto-refresh ticker runs (in milliseconds).
/// Matches the JS SDK's AUTO_REFRESH_TICK_DURATION (30 seconds).
const AUTO_REFRESH_TICK_DURATION_MS: u64 = 30_000;

/// How many ticks before expiry to trigger a refresh.
/// Matches the JS SDK's AUTO_REFRESH_TICK_THRESHOLD (3 ticks = ~90 seconds before expiry).
const AUTO_REFRESH_TICK_THRESHOLD: i64 = 3;

/// Margin in milliseconds before considering a token expired (10 seconds).
const EXPIRY_MARGIN_MS: i64 = 10_000;

/// Configuration for the GoTrue client.
pub struct GoTrueClientConfig<S: AuthStorage> {
    /// The GoTrue server URL (e.g., `https://<project>.supabase.co/auth/v1`).
    pub url: String,
    /// The Supabase anon key, sent as `apikey` header.
    pub api_key: String,
    /// The storage key prefix for persisting sessions.
    /// Defaults to something like `sb-<ref>-auth-token`.
    pub storage_key: String,
    /// The storage implementation.
    pub storage: S,
    /// Whether to auto-refresh tokens. Defaults to `true`.
    pub auto_refresh_token: bool,
}

struct Inner<S: AuthStorage> {
    url: String,
    api_key: String,
    storage_key: String,
    storage: S,
    auto_refresh_token: bool,
    http_client: reqwest::Client,
    event_tx: broadcast::Sender<(AuthChangeEvent, Option<Session>)>,
    /// Handle to the auto-refresh background task.
    auto_refresh_handle: Option<tokio::task::JoinHandle<()>>,
    /// Signal to stop the auto-refresh task.
    auto_refresh_cancel: Option<tokio::sync::watch::Sender<bool>>,
    /// Guard against concurrent refresh calls.
    _refreshing: Arc<Mutex<()>>,
}

/// A Rust client for Supabase GoTrue, focused on session management and token refresh.
///
/// This is the Rust equivalent of the JS `GoTrueClient` from `@supabase/auth-js`,
/// scoped to the features needed by the Tauri desktop app.
pub struct GoTrueClient<S: AuthStorage> {
    inner: Arc<RwLock<Inner<S>>>,
}

impl<S: AuthStorage> Clone for GoTrueClient<S> {
    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
        }
    }
}

impl<S: AuthStorage> GoTrueClient<S> {
    /// Create a new GoTrue client with the given configuration.
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
            auto_refresh_handle: None,
            auto_refresh_cancel: None,
            _refreshing: Arc::new(Mutex::new(())),
        };

        Self {
            inner: Arc::new(RwLock::new(inner)),
        }
    }

    // ─── Session Management ──────────────────────────────────────────

    /// Retrieve the current session from storage.
    /// If the session is expired but has a refresh token, it will be refreshed automatically
    /// when `auto_refresh_token` is enabled.
    pub async fn get_session(&self) -> Result<Option<Session>, GoTrueError> {
        let inner = self.inner.read().await;
        load_session_from_storage(&inner.storage, &inner.storage_key)
    }

    /// Set a session from access and refresh tokens.
    ///
    /// If the access token is expired, it will be refreshed using the refresh token.
    /// If the access token is still valid, the user info is fetched and a full session is stored.
    pub async fn set_session(
        &self,
        access_token: &str,
        refresh_token: &str,
    ) -> Result<Session, GoTrueError> {
        if access_token.is_empty() || refresh_token.is_empty() {
            return Err(GoTrueError::SessionMissing);
        }

        // Decode the JWT payload to check expiry (insecure decode, just for exp claim).
        let now = chrono::Utc::now().timestamp();
        let has_expired = match decode_jwt_exp(access_token) {
            Some(exp) => exp <= now,
            None => true,
        };

        if has_expired {
            // Token expired, refresh it.
            let session = self.call_refresh_token(refresh_token).await?;
            Ok(session)
        } else {
            // Token still valid, fetch user info and build session.
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

            {
                let inner = self.inner.read().await;
                save_session(&inner.storage, &inner.storage_key, &session)?;
                let _ = inner
                    .event_tx
                    .send((AuthChangeEvent::SignedIn, Some(session.clone())));
            }

            Ok(session)
        }
    }

    /// Force-refresh the current session.
    /// If no session exists in storage, returns `SessionMissing` error.
    pub async fn refresh_session(&self) -> Result<Session, GoTrueError> {
        let refresh_token = {
            let inner = self.inner.read().await;
            let session = load_session_from_storage(&inner.storage, &inner.storage_key)?;
            match session {
                Some(s) => s.refresh_token,
                None => return Err(GoTrueError::SessionMissing),
            }
        };

        self.call_refresh_token(&refresh_token).await
    }

    /// Sign out the user.
    ///
    /// For `SignOutScope::Local`, only clears the local session.
    /// For `SignOutScope::Global` or `SignOutScope::Others`, also calls the GoTrue `/logout` endpoint.
    pub async fn sign_out(&self, scope: SignOutScope) -> Result<(), GoTrueError> {
        if scope != SignOutScope::Local {
            // Try to call the server-side logout.
            let access_token = {
                let inner = self.inner.read().await;
                load_session_from_storage(&inner.storage, &inner.storage_key)?
                    .map(|s| s.access_token)
            };

            if let Some(token) = access_token {
                let result = self.api_sign_out(&token, scope).await;
                // For retryable errors or session missing, still clear locally.
                if let Err(ref e) = result {
                    if !e.is_retryable() && !e.is_fatal_session_error() {
                        return result;
                    }
                }
            }
        }

        // Clear local session.
        {
            let inner = self.inner.read().await;
            remove_session(&inner.storage, &inner.storage_key)?;
            let _ = inner.event_tx.send((AuthChangeEvent::SignedOut, None));
        }

        Ok(())
    }

    // ─── Auth State Change Events ────────────────────────────────────

    /// Subscribe to auth state change events.
    ///
    /// Returns a broadcast receiver that yields `(AuthChangeEvent, Option<Session>)` tuples.
    pub async fn on_auth_state_change(
        &self,
    ) -> broadcast::Receiver<(AuthChangeEvent, Option<Session>)> {
        let inner = self.inner.read().await;
        inner.event_tx.subscribe()
    }

    // ─── Auto Refresh ────────────────────────────────────────────────

    /// Start the auto-refresh background ticker.
    ///
    /// The ticker runs every 30 seconds and refreshes the token when it is
    /// within 3 ticks (~90 seconds) of expiry.
    pub async fn start_auto_refresh(&self) {
        // Stop any existing ticker first.
        self.stop_auto_refresh().await;

        let (cancel_tx, cancel_rx) = tokio::sync::watch::channel(false);
        let client = self.clone();

        let handle = tokio::spawn(async move {
            auto_refresh_loop(client, cancel_rx).await;
        });

        let mut inner = self.inner.write().await;
        inner.auto_refresh_handle = Some(handle);
        inner.auto_refresh_cancel = Some(cancel_tx);
    }

    /// Stop the auto-refresh background ticker.
    pub async fn stop_auto_refresh(&self) {
        let mut inner = self.inner.write().await;

        if let Some(cancel_tx) = inner.auto_refresh_cancel.take() {
            let _ = cancel_tx.send(true);
        }
        if let Some(handle) = inner.auto_refresh_handle.take() {
            handle.abort();
        }
    }

    /// Initialize the client: load session from storage, emit INITIAL_SESSION,
    /// and optionally start auto-refresh.
    pub async fn initialize(&self) -> Result<Option<Session>, GoTrueError> {
        let session = self.recover_and_refresh().await?;

        {
            let inner = self.inner.read().await;
            let _ = inner
                .event_tx
                .send((AuthChangeEvent::InitialSession, session.clone()));

            if inner.auto_refresh_token {
                drop(inner);
                self.start_auto_refresh().await;
            }
        }

        Ok(session)
    }

    // ─── OAuth URL Generation ────────────────────────────────────────

    /// Generate an OAuth authorization URL for a given provider.
    ///
    /// The returned URL can be opened in a browser to initiate the OAuth flow.
    pub async fn get_url_for_provider(
        &self,
        provider: &str,
        redirect_to: Option<&str>,
        scopes: Option<&str>,
    ) -> String {
        let inner = self.inner.read().await;

        let mut params = vec![format!(
            "provider={}",
            urlencoding::encode(provider)
        )];

        if let Some(redirect) = redirect_to {
            params.push(format!(
                "redirect_to={}",
                urlencoding::encode(redirect)
            ));
        }

        if let Some(scopes) = scopes {
            params.push(format!("scopes={}", urlencoding::encode(scopes)));
        }

        format!("{}/authorize?{}", inner.url, params.join("&"))
    }

    // ─── Internal Methods ────────────────────────────────────────────

    /// Call the GoTrue token refresh endpoint.
    async fn call_refresh_token(&self, refresh_token: &str) -> Result<Session, GoTrueError> {
        if refresh_token.is_empty() {
            return Err(GoTrueError::SessionMissing);
        }

        let session = self.refresh_access_token(refresh_token).await?;

        {
            let inner = self.inner.read().await;
            save_session(&inner.storage, &inner.storage_key, &session)?;
            let _ = inner
                .event_tx
                .send((AuthChangeEvent::TokenRefreshed, Some(session.clone())));
        }

        Ok(session)
    }

    /// Make the actual HTTP request to refresh the access token, with retry logic.
    async fn refresh_access_token(&self, refresh_token: &str) -> Result<Session, GoTrueError> {
        let max_retries = 3;
        let started_at = std::time::Instant::now();

        for attempt in 0..max_retries {
            if attempt > 0 {
                // Exponential backoff: 200ms, 400ms, 800ms, ...
                let backoff = Duration::from_millis(200 * 2u64.pow(attempt as u32 - 1));
                tokio::time::sleep(backoff).await;
            }

            match self.api_refresh_token(refresh_token).await {
                Ok(session) => return Ok(session),
                Err(e) => {
                    if !e.is_retryable() {
                        return Err(e);
                    }
                    // Check if we still have time for another retry within the tick duration.
                    let next_backoff_ms = 200 * 2u64.pow(attempt as u32);
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

    /// POST to `/token?grant_type=refresh_token`.
    async fn api_refresh_token(&self, refresh_token: &str) -> Result<Session, GoTrueError> {
        // Extract what we need from inner before making the HTTP request,
        // so we don't hold the RwLock across .await points.
        let (url, api_key, http_client) = {
            let inner = self.inner.read().await;
            (
                format!("{}/token?grant_type=refresh_token", inner.url),
                inner.api_key.clone(),
                inner.http_client.clone(),
            )
        };

        let response = http_client
            .post(&url)
            .header("apikey", &api_key)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json;charset=UTF-8")
            .json(&serde_json::json!({ "refresh_token": refresh_token }))
            .send()
            .await
            .map_err(|e| GoTrueError::RetryableFetchError(e.to_string()))?;

        let status = response.status().as_u16();
        if !response.status().is_success() {
            let body: GoTrueErrorBody = response
                .json()
                .await
                .unwrap_or_else(|_| GoTrueErrorBody {
                    error: Some("Unknown error".to_string()),
                    error_description: None,
                    code: None,
                    msg: None,
                    message: None,
                });
            return Err(GoTrueError::from_api_response(status, body));
        }

        let session: Session = response.json().await?;
        Ok(session)
    }

    /// GET `/user` to fetch the current user.
    async fn get_user(&self, access_token: &str) -> Result<User, GoTrueError> {
        let (url, api_key, http_client) = {
            let inner = self.inner.read().await;
            (
                format!("{}/user", inner.url),
                inner.api_key.clone(),
                inner.http_client.clone(),
            )
        };

        let response = http_client
            .get(&url)
            .header("apikey", &api_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await
            .map_err(|e| GoTrueError::RetryableFetchError(e.to_string()))?;

        let status = response.status().as_u16();
        if !response.status().is_success() {
            let body: GoTrueErrorBody = response
                .json()
                .await
                .unwrap_or_else(|_| GoTrueErrorBody {
                    error: Some("Unknown error".to_string()),
                    error_description: None,
                    code: None,
                    msg: None,
                    message: None,
                });
            return Err(GoTrueError::from_api_response(status, body));
        }

        let user: User = response.json().await?;
        Ok(user)
    }

    /// POST to `/logout` to sign out server-side.
    async fn api_sign_out(
        &self,
        access_token: &str,
        scope: SignOutScope,
    ) -> Result<(), GoTrueError> {
        let (url, api_key, http_client) = {
            let inner = self.inner.read().await;
            (
                format!("{}/logout", inner.url),
                inner.api_key.clone(),
                inner.http_client.clone(),
            )
        };

        let scope_str = match scope {
            SignOutScope::Global => "global",
            SignOutScope::Local => "local",
            SignOutScope::Others => "others",
        };

        let response = http_client
            .post(&url)
            .header("apikey", &api_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json;charset=UTF-8")
            .json(&serde_json::json!({ "scope": scope_str }))
            .send()
            .await
            .map_err(|e| GoTrueError::RetryableFetchError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body: GoTrueErrorBody = response
                .json()
                .await
                .unwrap_or_else(|_| GoTrueErrorBody {
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

    /// Recover session from storage and refresh if needed.
    async fn recover_and_refresh(&self) -> Result<Option<Session>, GoTrueError> {
        let inner = self.inner.read().await;
        let session = load_session_from_storage(&inner.storage, &inner.storage_key)?;

        let Some(session) = session else {
            return Ok(None);
        };

        if !is_valid_session(&session) {
            remove_session(&inner.storage, &inner.storage_key)?;
            return Ok(None);
        }

        let now_ms = chrono::Utc::now().timestamp_millis();
        let expires_with_margin = match session.expires_at {
            Some(exp) => (exp * 1000 - now_ms) < EXPIRY_MARGIN_MS,
            None => true,
        };

        drop(inner);

        if expires_with_margin {
            if !session.refresh_token.is_empty() {
                match self.call_refresh_token(&session.refresh_token).await {
                    Ok(refreshed) => Ok(Some(refreshed)),
                    Err(e) => {
                        if !e.is_retryable() {
                            let inner = self.inner.read().await;
                            remove_session(&inner.storage, &inner.storage_key)?;
                        }
                        Err(e)
                    }
                }
            } else {
                Ok(Some(session))
            }
        } else {
            // Session is still valid; emit SIGNED_IN.
            let inner = self.inner.read().await;
            let _ = inner
                .event_tx
                .send((AuthChangeEvent::SignedIn, Some(session.clone())));
            Ok(Some(session))
        }
    }
}

// ─── Auto-Refresh Loop ──────────────────────────────────────────────────

async fn auto_refresh_loop<S: AuthStorage>(
    client: GoTrueClient<S>,
    mut cancel_rx: tokio::sync::watch::Receiver<bool>,
) {
    // Run the first tick immediately.
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
    let session = {
        let inner = client.inner.read().await;
        match load_session_from_storage(&inner.storage, &inner.storage_key) {
            Ok(Some(s)) => s,
            _ => return,
        }
    };

    if session.refresh_token.is_empty() {
        return;
    }

    let expires_at = match session.expires_at {
        Some(exp) => exp,
        None => return,
    };

    let now = chrono::Utc::now().timestamp_millis();
    let expires_in_ticks =
        (expires_at * 1000 - now) / AUTO_REFRESH_TICK_DURATION_MS as i64;

    if expires_in_ticks <= AUTO_REFRESH_TICK_THRESHOLD {
        if let Err(e) = client.call_refresh_token(&session.refresh_token).await {
            if e.is_fatal_session_error() {
                // Fatal error: the refresh token is permanently invalid.
                // Session has already been cleared by call_refresh_token -> _callRefreshToken logic.
                // Log the error for observability.
                eprintln!("[auth] auto-refresh fatal error, session cleared: {}", e);
            } else {
                eprintln!("[auth] auto-refresh transient error (will retry): {}", e);
            }
        }
    }
}

// ─── Helper Functions ────────────────────────────────────────────────────

/// Decode the `exp` claim from a JWT without verifying the signature.
fn decode_jwt_exp(token: &str) -> Option<i64> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }

    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    let payload = URL_SAFE_NO_PAD.decode(parts[1]).ok()?;
    let claims: serde_json::Value = serde_json::from_slice(&payload).ok()?;
    claims.get("exp")?.as_i64()
}

fn is_valid_session(session: &Session) -> bool {
    !session.access_token.is_empty()
        && !session.refresh_token.is_empty()
        && session.expires_at.is_some()
}

fn load_session_from_storage<S: AuthStorage>(
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

fn remove_session<S: AuthStorage>(
    storage: &S,
    storage_key: &str,
) -> Result<(), GoTrueError> {
    storage
        .remove_item(storage_key)
        .map_err(GoTrueError::StorageError)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gotrue::storage::MemoryStorage;

    fn make_test_config() -> GoTrueClientConfig<MemoryStorage> {
        GoTrueClientConfig {
            url: "https://example.supabase.co/auth/v1".to_string(),
            api_key: "test-anon-key".to_string(),
            storage_key: "sb-test-auth-token".to_string(),
            storage: MemoryStorage::new(),
            auto_refresh_token: false,
        }
    }

    #[test]
    fn test_decode_jwt_exp() {
        use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

        let header = URL_SAFE_NO_PAD.encode(r#"{"alg":"HS256","typ":"JWT"}"#);
        let payload = URL_SAFE_NO_PAD.encode(r#"{"sub":"user-1","exp":1700000000}"#);
        let token = format!("{}.{}.sig", header, payload);

        assert_eq!(decode_jwt_exp(&token), Some(1700000000));
    }

    #[test]
    fn test_decode_jwt_exp_no_exp() {
        use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

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
        let session = Session {
            access_token: "at".to_string(),
            refresh_token: "rt".to_string(),
            expires_in: 3600,
            expires_at: Some(1700003600),
            token_type: "bearer".to_string(),
            user: User {
                id: "user-1".to_string(),
                email: None,
                phone: None,
                created_at: None,
                updated_at: None,
                user_metadata: Default::default(),
                app_metadata: Default::default(),
            },
        };
        assert!(is_valid_session(&session));
    }

    #[test]
    fn test_is_valid_session_missing_fields() {
        let session = Session {
            access_token: "".to_string(),
            refresh_token: "rt".to_string(),
            expires_in: 3600,
            expires_at: Some(1700003600),
            token_type: "bearer".to_string(),
            user: User {
                id: "user-1".to_string(),
                email: None,
                phone: None,
                created_at: None,
                updated_at: None,
                user_metadata: Default::default(),
                app_metadata: Default::default(),
            },
        };
        assert!(!is_valid_session(&session));
    }

    #[test]
    fn test_session_storage_roundtrip() {
        let storage = MemoryStorage::new();
        let key = "test-key";

        let session = Session {
            access_token: "at".to_string(),
            refresh_token: "rt".to_string(),
            expires_in: 3600,
            expires_at: Some(1700003600),
            token_type: "bearer".to_string(),
            user: User {
                id: "user-1".to_string(),
                email: Some("test@example.com".to_string()),
                phone: None,
                created_at: None,
                updated_at: None,
                user_metadata: Default::default(),
                app_metadata: Default::default(),
            },
        };

        save_session(&storage, key, &session).unwrap();
        let loaded = load_session_from_storage(&storage, key).unwrap().unwrap();

        assert_eq!(loaded.access_token, "at");
        assert_eq!(loaded.refresh_token, "rt");
        assert_eq!(loaded.user.id, "user-1");
        assert_eq!(loaded.user.email, Some("test@example.com".to_string()));
    }

    #[test]
    fn test_load_missing_session() {
        let storage = MemoryStorage::new();
        let result = load_session_from_storage(&storage, "nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_remove_session() {
        let storage = MemoryStorage::new();
        let key = "test-key";

        let session = Session {
            access_token: "at".to_string(),
            refresh_token: "rt".to_string(),
            expires_in: 3600,
            expires_at: Some(1700003600),
            token_type: "bearer".to_string(),
            user: User {
                id: "user-1".to_string(),
                email: None,
                phone: None,
                created_at: None,
                updated_at: None,
                user_metadata: Default::default(),
                app_metadata: Default::default(),
            },
        };

        save_session(&storage, key, &session).unwrap();
        assert!(load_session_from_storage(&storage, key).unwrap().is_some());

        remove_session(&storage, key).unwrap();
        assert!(load_session_from_storage(&storage, key).unwrap().is_none());
    }

    #[tokio::test]
    async fn test_get_session_empty() {
        let config = make_test_config();
        let client = GoTrueClient::new(config);
        let session = client.get_session().await.unwrap();
        assert!(session.is_none());
    }

    #[test]
    fn test_gotrue_error_is_fatal() {
        let err = GoTrueError::SessionMissing;
        assert!(err.is_fatal_session_error());

        let err = GoTrueError::ApiError {
            status: 400,
            message: "token not found".to_string(),
            code: Some("refresh_token_not_found".to_string()),
        };
        assert!(err.is_fatal_session_error());

        let err = GoTrueError::ApiError {
            status: 400,
            message: "already used".to_string(),
            code: Some("refresh_token_already_used".to_string()),
        };
        assert!(err.is_fatal_session_error());

        let err = GoTrueError::ApiError {
            status: 400,
            message: "some error".to_string(),
            code: Some("other_code".to_string()),
        };
        assert!(!err.is_fatal_session_error());
    }

    #[test]
    fn test_gotrue_error_is_retryable() {
        let err = GoTrueError::RetryableFetchError("timeout".to_string());
        assert!(err.is_retryable());

        let err = GoTrueError::SessionMissing;
        assert!(!err.is_retryable());
    }
}
