pub(crate) mod connect;
pub(crate) mod status;
pub(crate) mod webhook;

use axum::{
    Router,
    routing::{get, post},
};

use crate::config::NangoConfig;
use crate::state::AppState;

pub use connect::{
    ConnectSessionResponse, CreateConnectSessionRequest, CreateReconnectSessionRequest,
};
pub use status::{ConnectionItem, ListConnectionsResponse};
pub use webhook::WebhookResponse;

pub fn router(config: NangoConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/connect-session", post(connect::create_connect_session))
        .route(
            "/reconnect-session",
            post(connect::create_reconnect_session),
        )
        .route("/connections", get(status::list_connections))
        .with_state(state)
}

pub fn webhook_router(config: NangoConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/webhook", post(webhook::nango_webhook))
        .with_state(state)
}
