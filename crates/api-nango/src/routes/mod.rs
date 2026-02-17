pub(crate) mod connect;
pub(crate) mod status;
pub(crate) mod webhook;

use axum::{
    Router,
    routing::{get, post},
};

use crate::config::NangoConfig;
use crate::state::AppState;

pub use connect::ConnectSessionResponse;
pub use status::ConnectionStatusResponse;
pub use webhook::WebhookResponse;

pub fn router(config: NangoConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/connect-session", post(connect::create_connect_session))
        .route("/connection-status", get(status::connection_status))
        .with_state(state)
}

pub fn webhook_router(config: NangoConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/webhook", post(webhook::nango_webhook))
        .with_state(state)
}
