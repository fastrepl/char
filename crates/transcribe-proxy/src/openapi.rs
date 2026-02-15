use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(crate::routes::status::handler),
    components(schemas(
        crate::routes::status::SttStatusResponse,
    )),
    tags((name = "stt", description = "Speech-to-text transcription proxy"))
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
