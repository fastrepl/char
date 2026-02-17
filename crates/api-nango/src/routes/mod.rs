pub(crate) mod connect;
pub(crate) mod webhook;

use axum::{Router, routing::post};

use crate::config::NangoConfig;
use crate::state::AppState;

pub use connect::ConnectSessionResponse;
pub use webhook::WebhookResponse;

pub fn router(config: NangoConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/connect-session", post(connect::create_connect_session))
        .with_state(state)
}

pub fn webhook_router(config: NangoConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/webhook", post(webhook::nango_webhook))
        .with_state(state)
}
