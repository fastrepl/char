use utoipa::OpenApi;

use crate::routes::{ConnectSessionResponse, WebhookResponse};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::connect::create_connect_session,
        crate::routes::webhook::nango_webhook,
    ),
    components(
        schemas(
            ConnectSessionResponse,
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
