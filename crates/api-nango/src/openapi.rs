use utoipa::OpenApi;

use crate::routes::{
    ConnectSessionResponse, ConnectionItem, CreateConnectSessionRequest,
    CreateReconnectSessionRequest, DeleteConnectionRequest, DeleteConnectionResponse,
    ListConnectionsResponse, WebhookResponse,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::connect::create_connect_session,
        crate::routes::connect::create_reconnect_session,
        crate::routes::disconnect::delete_connection,
        crate::routes::status::list_connections,
        crate::routes::webhook::nango_webhook,
    ),
    components(
        schemas(
            CreateConnectSessionRequest,
            CreateReconnectSessionRequest,
            DeleteConnectionRequest,
            DeleteConnectionResponse,
            ConnectSessionResponse,
            ConnectionItem,
            ListConnectionsResponse,
            WebhookResponse,
        )
    ),
    tags(
        (name = "nango", description = "Integration management via Nango")
    )
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
