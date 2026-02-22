use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, BotError>;

#[derive(Debug, Serialize)]
struct ErrorBody {
    error: ErrorDetails,
}

#[derive(Debug, Serialize)]
struct ErrorDetails {
    code: String,
    message: String,
}

#[derive(Debug, Error)]
pub enum BotError {
    #[error("Invalid request: {0}")]
    #[allow(dead_code)]
    BadRequest(String),

    #[error("Recall API error: {0}")]
    Recall(#[from] hypr_recall::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for BotError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg),
            Self::Recall(err) => {
                let msg = err.to_string();
                tracing::error!(error = %msg, "recall_error");
                (StatusCode::BAD_GATEWAY, "recall_error", msg)
            }
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal_error");
                sentry::capture_message(&msg, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_server_error",
                    "Internal server error".into(),
                )
            }
        };

        let body = Json(ErrorBody {
            error: ErrorDetails {
                code: code.to_string(),
                message,
            },
        });

        (status, body).into_response()
    }
}
