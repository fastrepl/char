pub(crate) mod storage;

use axum::{Router, routing::post};

use crate::config::StorageConfig;
use crate::state::AppState;

pub fn router(config: StorageConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/files", post(storage::list_files))
        .route("/files/get", post(storage::get_file))
        .route("/files/download", post(storage::download_file))
        .with_state(state)
}
