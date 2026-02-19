use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, NangoError>;

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
pub enum NangoError {
    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Nango error: {0}")]
    Nango(String),

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    #[allow(dead_code)]
    Internal(String),
}

impl From<hypr_nango::Error> for NangoError {
    fn from(err: hypr_nango::Error) -> Self {
        Self::Nango(err.to_string())
    }
}

impl IntoResponse for NangoError {
    fn into_response(self) -> Response {
        let internal_message = "Internal server error".to_string();

        let (status, code, message) = match self {
            Self::Auth(message) => (StatusCode::UNAUTHORIZED, "unauthorized", message),
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, "bad_request", message),
            Self::Nango(message) => {
                tracing::error!(error = %message, "nango_error");
                sentry::capture_message(&message, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "nango_error",
                    internal_message,
                )
            }
            Self::Internal(message) => {
                tracing::error!(error = %message, "internal_error");
                sentry::capture_message(&message, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_server_error",
                    internal_message,
                )
            }
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
