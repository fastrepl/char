use utoipa::OpenApi;

use crate::routes::{ConnectSessionResponse, ConnectionStatusResponse, WebhookResponse};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::connect::create_connect_session,
        crate::routes::status::connection_status,
        crate::routes::webhook::nango_webhook,
    ),
    components(
        schemas(
            ConnectSessionResponse,
            ConnectionStatusResponse,
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
