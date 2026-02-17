use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SyncError>;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug, Error)]
pub enum SyncError {
    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<hypr_supabase_auth::Error> for SyncError {
    fn from(err: hypr_supabase_auth::Error) -> Self {
        Self::Auth(err.to_string())
    }
}

impl IntoResponse for SyncError {
    fn into_response(self) -> Response {
        let (status, error_code) = match &self {
            Self::Auth(_) => (StatusCode::UNAUTHORIZED, "unauthorized"),
            Self::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad_request"),
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal_error");
                sentry::capture_message(msg, sentry::Level::Error);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_server_error")
            }
        };

        let body = Json(ErrorResponse {
            error: error_code.to_string(),
        });

        (status, body).into_response()
    }
}
