use utoipa::OpenApi;

use crate::routes::{
    ConnectSessionResponse, ConnectionItem, CreateConnectSessionRequest, ListConnectionsResponse,
    WebhookResponse,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::connect::create_connect_session,
        crate::routes::status::list_connections,
        crate::routes::webhook::nango_webhook,
    ),
    components(
        schemas(
            CreateConnectSessionRequest,
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
