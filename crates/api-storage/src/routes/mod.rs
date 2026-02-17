pub(crate) mod storage;

use axum::{Router, routing::post};

pub fn router() -> Router {
    Router::new()
        .route("/files", post(storage::list_files))
        .route("/files/get", post(storage::get_file))
        .route("/files/download", post(storage::download_file))
}
