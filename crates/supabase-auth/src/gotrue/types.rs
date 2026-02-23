use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a user session from GoTrue.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub expires_at: Option<i64>,
    pub token_type: String,
    pub user: User,
}

/// Represents a GoTrue user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub user_metadata: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub app_metadata: HashMap<String, serde_json::Value>,
}

/// Auth state change events, mirroring the JS SDK's AuthChangeEvent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthChangeEvent {
    InitialSession,
    SignedIn,
    SignedOut,
    TokenRefreshed,
    UserUpdated,
}

impl std::fmt::Display for AuthChangeEvent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InitialSession => write!(f, "INITIAL_SESSION"),
            Self::SignedIn => write!(f, "SIGNED_IN"),
            Self::SignedOut => write!(f, "SIGNED_OUT"),
            Self::TokenRefreshed => write!(f, "TOKEN_REFRESHED"),
            Self::UserUpdated => write!(f, "USER_UPDATED"),
        }
    }
}

/// GoTrue API error response body.
#[derive(Debug, Clone, Deserialize)]
pub struct GoTrueErrorBody {
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub error_description: Option<String>,
    #[serde(default, alias = "error_code")]
    pub code: Option<String>,
    #[serde(default)]
    pub msg: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

/// Scope for sign-out operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SignOutScope {
    /// Sign out from the current session only.
    Local,
    /// Sign out from all sessions for the user.
    Global,
    /// Sign out from all other sessions except the current one.
    Others,
}
