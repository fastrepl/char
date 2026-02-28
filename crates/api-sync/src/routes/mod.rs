mod blobs;
mod ops;
mod vaults;

use axum::Router;
use axum::routing::{get, head, post};
use utoipa::OpenApi;

use crate::state::AppState;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "sync", description = "Sync management")
    )
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    let vault_routes = Router::new()
        .route("/", post(vaults::create_vault))
        .route("/", get(vaults::list_vaults))
        .route("/{vault_id}/devices", post(vaults::register_device))
        .route("/{vault_id}/ops", post(ops::push_ops))
        .route("/{vault_id}/ops", get(ops::pull_ops))
        .route("/{vault_id}/blobs", post(blobs::upload_blob))
        .route("/{vault_id}/blobs/{hash}", head(blobs::check_blob))
        .route("/{vault_id}/blobs/{hash}", get(blobs::download_blob));

    Router::new()
        .nest("/vaults", vault_routes)
        .with_state(state)
}
