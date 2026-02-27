mod chunk;
mod response;
mod transcribe;

use std::convert::Infallible;
use std::path::Path;

use axum::{
    Json,
    http::StatusCode,
    response::{
        IntoResponse, Response,
        sse::{Event, Sse},
    },
};
use bytes::Bytes;
use owhisper_interface::ListenParams;
use owhisper_interface::progress::InferenceProgress;
use tokio::sync::mpsc;

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

pub async fn handle_batch_sse(
    body: Bytes,
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Response {
    let model_path = model_path.to_path_buf();
    let content_type = content_type.to_string();
    let params = params.clone();

    let (progress_tx, progress_rx) = mpsc::unbounded_channel::<InferenceProgress>();
    let (result_tx, result_rx) = tokio::sync::oneshot::channel();

    tokio::task::spawn_blocking(move || {
        let result = transcribe_batch(
            &body,
            &content_type,
            &params,
            &model_path,
            Some(progress_tx),
        );
        let _ = result_tx.send(result);
    });

    enum Phase {
        Progress(
            mpsc::UnboundedReceiver<InferenceProgress>,
            tokio::sync::oneshot::Receiver<
                Result<owhisper_interface::batch::Response, crate::Error>,
            >,
        ),
        Result(
            tokio::sync::oneshot::Receiver<
                Result<owhisper_interface::batch::Response, crate::Error>,
            >,
        ),
        Done,
    }

    let event_stream = futures_util::stream::unfold(
        Phase::Progress(progress_rx, result_rx),
        |phase| async move {
            match phase {
                Phase::Progress(mut rx, result_rx) => match rx.recv().await {
                    Some(progress) => {
                        let data = serde_json::json!({
                            "percentage": progress.percentage,
                            "partial_text": progress.partial_text,
                            "phase": progress.phase,
                        });
                        let event = Event::default().event("progress").json_data(data).unwrap();
                        Some((Ok::<_, Infallible>(event), Phase::Progress(rx, result_rx)))
                    }
                    None => Some((
                        Ok(Event::default().comment("progress_done")),
                        Phase::Result(result_rx),
                    )),
                },
                Phase::Result(result_rx) => {
                    let event = match result_rx.await {
                        Ok(Ok(response)) => Event::default()
                            .event("result")
                            .json_data(&response)
                            .unwrap(),
                        Ok(Err(e)) => {
                            tracing::error!(error = %e, "batch_sse transcription failed");
                            Event::default()
                                .event("error")
                                .json_data(serde_json::json!({
                                    "error": "transcription_failed",
                                    "detail": e.to_string()
                                }))
                                .unwrap()
                        }
                        Err(_) => {
                            tracing::error!("batch_sse transcription task panicked");
                            Event::default()
                                .event("error")
                                .json_data(serde_json::json!({
                                    "error": "transcription_failed",
                                    "detail": "task panicked"
                                }))
                                .unwrap()
                        }
                    };
                    Some((Ok(event), Phase::Done))
                }
                Phase::Done => None,
            }
        },
    );

    Sse::new(event_stream).into_response()
}
