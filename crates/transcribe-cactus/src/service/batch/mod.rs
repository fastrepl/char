mod audio;
mod response;
mod transcribe;

use std::convert::Infallible;
use std::path::Path;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response, sse::Event, sse::Sse},
};
use bytes::Bytes;
use futures_util::stream;
use owhisper_interface::ListenParams;
use tokio::sync::mpsc;

use transcribe::{ProgressEvent, transcribe_batch};

pub async fn handle_batch(
    body: Bytes,
    content_type: &str,
    accept: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Response {
    if accept.contains("text/event-stream") {
        handle_batch_sse(body, content_type, params, model_path).await
    } else {
        handle_batch_json(body, content_type, params, model_path).await
    }
}

async fn handle_batch_json(
    body: Bytes,
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Response {
    let model_path = model_path.to_path_buf();
    let content_type = content_type.to_string();
    let params = params.clone();

    let result = tokio::task::spawn_blocking(move || {
        transcribe_batch(&body, &content_type, &params, &model_path, None)
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

async fn handle_batch_sse(
    body: Bytes,
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Response {
    let model_path = model_path.to_path_buf();
    let content_type = content_type.to_string();
    let params = params.clone();

    let (progress_tx, progress_rx) = mpsc::unbounded_channel::<ProgressEvent>();
    let (result_tx, result_rx) = mpsc::unbounded_channel::<Result<String, String>>();

    tokio::task::spawn_blocking(move || {
        let outcome = transcribe_batch(
            &body,
            &content_type,
            &params,
            &model_path,
            Some(progress_tx),
        );
        match outcome {
            Ok(response) => match serde_json::to_string(&response) {
                Ok(json) => {
                    let _ = result_tx.send(Ok(json));
                }
                Err(e) => {
                    let _ = result_tx.send(Err(e.to_string()));
                }
            },
            Err(e) => {
                let _ = result_tx.send(Err(e.to_string()));
            }
        }
    });

    let sse_stream = stream::unfold(
        (Some(progress_rx), result_rx),
        |(mut progress_rx, mut result_rx)| async move {
            if let Some(ref mut prx) = progress_rx {
                tokio::select! {
                    biased;
                    result = result_rx.recv() => {
                        match result {
                            Some(Ok(json)) => {
                                let event = Event::default().event("result").data(json);
                                Some((Ok::<Event, Infallible>(event), (progress_rx, result_rx)))
                            }
                            Some(Err(e)) => {
                                let event = Event::default().event("error").data(e);
                                Some((Ok(event), (progress_rx, result_rx)))
                            }
                            None => None,
                        }
                    }
                    progress = prx.recv() => {
                        match progress {
                            Some(p) => {
                                let data = serde_json::json!({
                                    "token": p.token,
                                    "percentage": p.percentage,
                                });
                                let event = Event::default()
                                    .event("progress")
                                    .data(data.to_string());
                                Some((Ok(event), (progress_rx, result_rx)))
                            }
                            None => {
                                // Progress channel closed — wait for the final result.
                                match result_rx.recv().await {
                                    Some(Ok(json)) => {
                                        let event = Event::default().event("result").data(json);
                                        Some((Ok(event), (None, result_rx)))
                                    }
                                    Some(Err(e)) => {
                                        let event = Event::default().event("error").data(e);
                                        Some((Ok(event), (None, result_rx)))
                                    }
                                    None => None,
                                }
                            }
                        }
                    }
                }
            } else {
                None
            }
        },
    );

    Sse::new(sse_stream).into_response()
}
