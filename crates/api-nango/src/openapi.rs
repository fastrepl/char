use utoipa::OpenApi;

use crate::routes::{
    ConnectSessionResponse, ConnectionItem, ListConnectionsResponse, WebhookResponse,
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
