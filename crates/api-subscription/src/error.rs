use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SubscriptionError>;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug, Error)]
pub enum SubscriptionError {
    #[error("Supabase request failed: {0}")]
    SupabaseRequest(String),

    #[error("Stripe error: {0}")]
    Stripe(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<stripe::StripeError> for SubscriptionError {
    fn from(err: stripe::StripeError) -> Self {
        Self::Stripe(err.to_string())
    }
}

impl IntoResponse for SubscriptionError {
    fn into_response(self) -> Response {
        let error_code = match &self {
            Self::SupabaseRequest(msg) => {
                tracing::error!(error = %msg, "supabase_error");
                sentry::capture_message(msg, sentry::Level::Error);
                "supabase_error"
            }
            Self::Stripe(msg) => {
                tracing::error!(error = %msg, "stripe_error");
                sentry::capture_message(msg, sentry::Level::Error);
                "stripe_error"
            }
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal_error");
                sentry::capture_message(msg, sentry::Level::Error);
                "internal_server_error"
            }
        };

        let body = Json(ErrorResponse {
            error: error_code.to_string(),
        });

        (StatusCode::INTERNAL_SERVER_ERROR, body).into_response()
    }
}
