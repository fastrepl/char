use super::types::GoTrueErrorBody;

/// Errors that can occur during GoTrue client operations.
#[derive(Debug, thiserror::Error)]
pub enum GoTrueError {
    /// A retryable network/fetch error.
    #[error("retryable fetch error: {0}")]
    RetryableFetchError(String),

    /// Session is missing (no refresh token, no stored session, etc.).
    #[error("session missing")]
    SessionMissing,

    /// An API error returned by the GoTrue server.
    #[error("API error ({status}): {message}")]
    ApiError {
        status: u16,
        message: String,
        code: Option<String>,
    },

    /// HTTP request failed.
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    /// JSON serialization/deserialization error.
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    /// Storage operation failed.
    #[error("storage error: {0}")]
    StorageError(String),
}

impl GoTrueError {
    /// Whether this error is retryable (transient network issue).
    pub fn is_retryable(&self) -> bool {
        matches!(self, Self::RetryableFetchError(_))
    }

    /// Whether this is a fatal session error that requires clearing the session.
    pub fn is_fatal_session_error(&self) -> bool {
        match self {
            Self::SessionMissing => true,
            Self::ApiError { code, .. } => {
                matches!(
                    code.as_deref(),
                    Some("refresh_token_not_found") | Some("refresh_token_already_used")
                )
            }
            _ => false,
        }
    }

    pub fn is_ignorable_signout_error(&self) -> bool {
        match self {
            Self::SessionMissing => true,
            Self::ApiError { status, .. } => matches!(*status, 401 | 403 | 404),
            _ => false,
        }
    }

    /// Create an API error from a GoTrue error response body and HTTP status.
    pub(crate) fn from_api_response(status: u16, body: GoTrueErrorBody) -> Self {
        let message = body
            .msg
            .or(body.message)
            .or(body.error_description)
            .or(body.error)
            .unwrap_or_else(|| format!("Unknown error (status {})", status));

        Self::ApiError {
            status,
            message,
            code: body.code,
        }
    }
}
