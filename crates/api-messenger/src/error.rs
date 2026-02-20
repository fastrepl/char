use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use thiserror::Error;

pub type Result<T> = std::result::Result<T, MessengerError>;

#[derive(Debug, Error)]
pub enum MessengerError {
    #[error("Slack error: {0}")]
    Slack(#[from] hypr_slack_web::Error),

    #[error("Teams error: {0}")]
    Teams(#[from] hypr_teems::Error),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for MessengerError {
    fn into_response(self) -> Response {
        let status = match &self {
            MessengerError::BadRequest(_) => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, self.to_string()).into_response()
    }
}
