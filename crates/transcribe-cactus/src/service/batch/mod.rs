mod audio;
mod response;
mod transcribe;

use std::path::Path;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use bytes::Bytes;
use owhisper_interface::ListenParams;

use transcribe::transcribe_batch;

pub async fn handle_batch(
    body: Bytes,
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Response {
    let model_path = model_path.to_path_buf();
    let content_type = content_type.to_string();
    let params = params.clone();

    let result = tokio::task::spawn_blocking(move || {
        transcribe_batch(&body, &content_type, &params, &model_path)
    })
    .await;

    match result {
        Ok(Ok(response)) => Json(response).into_response(),
        Ok(Err(e)) => {
            tracing::error!(error = %e, "batch_transcription_failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "transcription_failed",
                    "detail": e.to_string()
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "batch_task_panicked");
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}
