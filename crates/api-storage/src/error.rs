use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, StorageError>;

#[derive(Debug, Serialize)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: ErrorDetails,
}

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Authentication error: {0}")]
    #[allow(dead_code)]
    Auth(String),

    #[error("Invalid request: {0}")]
    #[allow(dead_code)]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error(transparent)]
    NangoConnection(#[from] hypr_api_nango::NangoConnectionError),
}

impl IntoResponse for StorageError {
    fn into_response(self) -> Response {
        let internal_message = "Internal server error".to_string();

        let (status, code, message) = match self {
            Self::Auth(message) => (StatusCode::UNAUTHORIZED, "unauthorized", message),
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, "bad_request", message),
            Self::Internal(message) => {
                tracing::error!(error = %message, "internal_error");
                sentry::capture_message(&message, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_server_error",
                    internal_message,
                )
            }
            Self::NangoConnection(err) => return err.into_response(),
        };

        let body = Json(ErrorResponse {
            error: ErrorDetails {
                code: code.to_string(),
                message,
            },
        });

        (status, body).into_response()
    }
}
