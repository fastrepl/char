use std::path::Path;
use std::time::Duration;

use supabase_auth::gotrue::{
    AuthChangeEvent, AuthStorage, GoTrueClient, GoTrueClientConfig, MemoryStorage, Session,
    SignOutScope,
};

const GOTRUE_URL: &str = "http://127.0.0.1:54321/auth/v1";

fn load_signing_key() -> (jsonwebtoken::EncodingKey, String) {
    use base64::Engine;

    let signing_keys_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("supabase/signing_keys.json");
    let content = std::fs::read_to_string(signing_keys_path)
        .expect("supabase/signing_keys.json not found — is Supabase initialized?");

    let jwks: Vec<serde_json::Value> = serde_json::from_str(&content).unwrap();
    let jwk = &jwks[0];
    let kid = jwk["kid"].as_str().unwrap().to_string();

    let url_safe = base64::engine::general_purpose::URL_SAFE_NO_PAD;
    let d = url_safe.decode(jwk["d"].as_str().unwrap()).unwrap();

    let pem = ec_p256_private_key_to_pkcs8_pem(&d);
    let key = jsonwebtoken::EncodingKey::from_ec_pem(pem.as_bytes())
        .expect("failed to create EncodingKey from EC PEM");
    (key, kid)
}

fn ec_p256_private_key_to_pkcs8_pem(d: &[u8]) -> String {
    use base64::Engine;

    let ec_oid: &[u8] = &[0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01];
    let p256_oid: &[u8] = &[0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];

    let mut inner_ec = Vec::new();
    inner_ec.extend_from_slice(&[0x02, 0x01, 0x01]);
    inner_ec.push(0x04);
    inner_ec.push(d.len() as u8);
    inner_ec.extend_from_slice(d);
    let mut ec_seq = vec![0x30, inner_ec.len() as u8];
    ec_seq.extend_from_slice(&inner_ec);

    let mut algo = Vec::new();
    algo.extend_from_slice(ec_oid);
    algo.extend_from_slice(p256_oid);
    let mut algo_seq = vec![0x30, algo.len() as u8];
    algo_seq.extend_from_slice(&algo);

    let mut key_octet = vec![0x04, ec_seq.len() as u8];
    key_octet.extend_from_slice(&ec_seq);

    let version: &[u8] = &[0x02, 0x01, 0x00];
    let mut outer = Vec::new();
    outer.extend_from_slice(version);
    outer.extend_from_slice(&algo_seq);
    outer.extend_from_slice(&key_octet);

    let mut der = vec![0x30, outer.len() as u8];
    der.extend_from_slice(&outer);

    let b64 = base64::engine::general_purpose::STANDARD.encode(&der);
    let lines: Vec<&str> = b64
        .as_bytes()
        .chunks(64)
        .map(|c| std::str::from_utf8(c).unwrap())
        .collect();
    format!(
        "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----\n",
        lines.join("\n")
    )
}

fn generate_jwt(role: &str) -> String {
    let (key, kid) = load_signing_key();
    let mut header = jsonwebtoken::Header::new(jsonwebtoken::Algorithm::ES256);
    header.kid = Some(kid);

    let claims = serde_json::json!({
        "iss": "supabase-demo",
        "role": role,
        "exp": 1983812996_i64,
        "iat": 1768925145_i64,
    });
    jsonwebtoken::encode(&header, &claims, &key).unwrap()
}

fn anon_key() -> String {
    generate_jwt("anon")
}

fn service_role_key() -> String {
    generate_jwt("service_role")
}

fn random_email() -> String {
    format!("test-{}@example.com", uuid::Uuid::new_v4())
}

fn make_client() -> GoTrueClient<MemoryStorage> {
    GoTrueClient::new(GoTrueClientConfig {
        url: GOTRUE_URL.to_string(),
        api_key: anon_key(),
        storage_key: format!("sb-test-{}", uuid::Uuid::new_v4()),
        storage: MemoryStorage::new(),
        auto_refresh_token: false,
    })
}

async fn signup_user(email: &str, password: &str) -> Session {
    let api_key = anon_key();
    let resp = reqwest::Client::new()
        .post(format!("{}/signup", GOTRUE_URL))
        .header("apikey", &api_key)
        .bearer_auth(&api_key)
        .json(&serde_json::json!({ "email": email, "password": password }))
        .send()
        .await
        .expect("signup request failed");

    assert!(
        resp.status().is_success(),
        "signup failed: {}",
        resp.text().await.unwrap()
    );
    resp.json().await.unwrap()
}

async fn logout_user(access_token: &str) {
    let key = service_role_key();
    let _ = reqwest::Client::new()
        .post(format!("{}/logout", GOTRUE_URL))
        .header("apikey", &key)
        .bearer_auth(access_token)
        .json(&serde_json::json!({"scope": "global"}))
        .send()
        .await;
}

async fn is_gotrue_reachable() -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .unwrap();
    client
        .get(format!("{}/health", GOTRUE_URL))
        .send()
        .await
        .is_ok()
}

macro_rules! require_local_supabase {
    () => {
        if !is_gotrue_reachable().await {
            eprintln!("skipping: local Supabase not reachable at {}", GOTRUE_URL);
            return;
        }
    };
}

#[tokio::test]
#[ignore]
async fn test_set_session_and_get_session() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    let session = client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    assert_eq!(session.user.email.as_deref(), Some(email.as_str()));
    assert!(!session.access_token.is_empty());
    assert!(!session.refresh_token.is_empty());
    assert!(!session.user.id.is_empty());
    assert!(session.expires_at.is_some());
    assert!(session.expires_in > 0);
    assert_eq!(session.token_type, "bearer");

    let stored = client
        .get_session()
        .await
        .expect("get_session failed")
        .expect("session should be stored");
    assert_eq!(stored.access_token, session.access_token);
    assert_eq!(stored.user.id, session.user.id);

    logout_user(&session.access_token).await;
}

#[tokio::test]
#[ignore]
async fn test_refresh_session() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    tokio::time::sleep(Duration::from_secs(1)).await;

    let refreshed = client
        .refresh_session()
        .await
        .expect("refresh_session failed");

    assert!(!refreshed.access_token.is_empty());
    assert!(!refreshed.refresh_token.is_empty());
    assert!(refreshed.expires_at.is_some());
    assert_eq!(refreshed.user.email.as_deref(), Some(email.as_str()));

    logout_user(&refreshed.access_token).await;
}

#[tokio::test]
#[ignore]
async fn test_refresh_session_without_session_fails() {
    require_local_supabase!();

    let client = make_client();
    let result = client.refresh_session().await;
    assert!(result.is_err());
}

#[tokio::test]
#[ignore]
async fn test_set_session_empty_tokens_fails() {
    let client = make_client();

    let result = client.set_session("", "some-refresh").await;
    assert!(result.is_err());

    let result = client.set_session("some-access", "").await;
    assert!(result.is_err());
}

#[tokio::test]
#[ignore]
async fn test_sign_out_local() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    assert!(client.get_session().await.unwrap().is_some());

    client
        .sign_out(SignOutScope::Local)
        .await
        .expect("sign_out failed");

    assert!(client.get_session().await.unwrap().is_none());
}

#[tokio::test]
#[ignore]
async fn test_sign_out_global() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    client
        .sign_out(SignOutScope::Global)
        .await
        .expect("sign_out global failed");

    assert!(client.get_session().await.unwrap().is_none());
}

#[tokio::test]
#[ignore]
async fn test_sign_out_others_keeps_local_session() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    client
        .sign_out(SignOutScope::Others)
        .await
        .expect("sign_out others failed");

    assert!(
        client.get_session().await.unwrap().is_some(),
        "local session should be preserved after sign_out(Others)"
    );

    logout_user(&signup.access_token).await;
}

#[tokio::test]
#[ignore]
async fn test_get_url_for_provider() {
    let client = make_client();

    let url = client.get_url_for_provider("github", None, None);
    assert!(url.starts_with(GOTRUE_URL));
    assert!(url.contains("provider=github"));

    let url = client.get_url_for_provider(
        "google",
        Some("http://localhost:3000/callback"),
        Some("email profile"),
    );
    assert!(url.contains("provider=google"));
    assert!(url.contains("redirect_to="));
    assert!(url.contains("scopes="));
}

#[tokio::test]
#[ignore]
async fn test_auth_state_change_events_on_set_session() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    let mut rx = client.on_auth_state_change();

    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    let (event, session) = tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout waiting for event")
        .expect("channel closed");

    assert_eq!(event, AuthChangeEvent::SignedIn);
    assert!(session.is_some());
    assert_eq!(session.unwrap().user.email.as_deref(), Some(email.as_str()));

    logout_user(&signup.access_token).await;
}

#[tokio::test]
#[ignore]
async fn test_auth_state_change_events_on_sign_out() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    let mut rx = client.on_auth_state_change();

    client
        .sign_out(SignOutScope::Local)
        .await
        .expect("sign_out failed");

    let (event, session) = tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout waiting for event")
        .expect("channel closed");

    assert_eq!(event, AuthChangeEvent::SignedOut);
    assert!(session.is_none());
}

#[tokio::test]
#[ignore]
async fn test_auth_state_change_events_on_refresh() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    let mut rx = client.on_auth_state_change();

    tokio::time::sleep(Duration::from_secs(1)).await;

    let refreshed = client
        .refresh_session()
        .await
        .expect("refresh_session failed");

    let (event, session) = tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout waiting for event")
        .expect("channel closed");

    assert_eq!(event, AuthChangeEvent::TokenRefreshed);
    assert!(session.is_some());
    assert!(!session.unwrap().access_token.is_empty());

    logout_user(&refreshed.access_token).await;
}

#[tokio::test]
#[ignore]
async fn test_initialize_emits_initial_session() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let storage = MemoryStorage::new();
    let storage_key = format!("sb-test-{}", uuid::Uuid::new_v4());

    storage
        .set_item(&storage_key, &serde_json::to_string(&signup).unwrap())
        .unwrap();

    let client = GoTrueClient::new(GoTrueClientConfig {
        url: GOTRUE_URL.to_string(),
        api_key: anon_key(),
        storage_key,
        storage,
        auto_refresh_token: false,
    });

    let mut rx = client.on_auth_state_change();

    let init_session = client.initialize().await.expect("initialize failed");
    assert!(init_session.is_some());

    let (event, _) = tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout waiting for initial_session event")
        .expect("channel closed");

    assert_eq!(event, AuthChangeEvent::InitialSession);

    logout_user(&signup.access_token).await;
}

#[tokio::test]
#[ignore]
async fn test_initialize_no_session() {
    require_local_supabase!();

    let client = make_client();
    let mut rx = client.on_auth_state_change();

    let session = client.initialize().await.expect("initialize failed");
    assert!(session.is_none());

    let (event, session) = tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout waiting for event")
        .expect("channel closed");

    assert_eq!(event, AuthChangeEvent::InitialSession);
    assert!(session.is_none());
}

#[tokio::test]
#[ignore]
async fn test_refresh_rotates_tokens() {
    require_local_supabase!();

    let email = random_email();
    let signup = signup_user(&email, "password123456").await;

    let client = make_client();
    client
        .set_session(&signup.access_token, &signup.refresh_token)
        .await
        .expect("set_session failed");

    let original_refresh = signup.refresh_token.clone();

    tokio::time::sleep(Duration::from_secs(1)).await;

    let refreshed = client
        .refresh_session()
        .await
        .expect("refresh_session failed");

    assert_ne!(refreshed.refresh_token, original_refresh);

    logout_user(&refreshed.access_token).await;
}
