use std::io::Write;
use std::time::Duration;

use axum::{
    Json,
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use backon::{ExponentialBuilder, Retryable};

use owhisper_client::{
    AssemblyAIAdapter, BatchClient, DeepgramAdapter, ElevenLabsAdapter, GladiaAdapter,
    MistralAdapter, OpenAIAdapter, Provider, SonioxAdapter,
};
use owhisper_interface::ListenParams;
use owhisper_interface::batch::Response as BatchResponse;

use crate::hyprnote_routing::{RetryConfig, is_retryable_error, should_use_hyprnote_routing};
use crate::provider_selector::SelectedProvider;
use crate::query_params::QueryParams;

use super::AppState;

pub async fn handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut params: QueryParams,
    body: Bytes,
) -> Response {
    if body.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "missing_audio_data",
                "detail": "Request body is empty"
            })),
        )
            .into_response();
    }

    let content_type = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    let listen_params = build_listen_params(&params);

    let provider_param = params.get_first("provider").map(|s| s.to_string());
    let use_hyprnote_routing = should_use_hyprnote_routing(provider_param.as_deref());

    if use_hyprnote_routing {
        return handle_hyprnote_batch(&state, &params, listen_params, body, content_type).await;
    }

    let selected = match state.resolve_provider(&mut params) {
        Ok(v) => v,
        Err(resp) => return resp,
    };

    tracing::info!(
        provider = ?selected.provider(),
        content_type = %content_type,
        body_size_bytes = %body.len(),
        "batch_transcription_request_received"
    );

    match transcribe_with_provider(&selected, listen_params, body, content_type).await {
        Ok(response) => Json(response).into_response(),
        Err(e) => {
            tracing::error!(
                error = %e,
                provider = ?selected.provider(),
                "batch_transcription_failed"
            );
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({
                    "error": "transcription_failed",
                    "detail": e
                })),
            )
                .into_response()
        }
    }
}

async fn handle_hyprnote_batch(
    state: &AppState,
    params: &QueryParams,
    listen_params: ListenParams,
    body: Bytes,
    content_type: &str,
) -> Response {
    let provider_chain = state.resolve_hyprnote_provider_chain(params);

    if provider_chain.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "no_providers_available",
                "detail": "No providers available for the requested language(s)"
            })),
        )
            .into_response();
    }

    let retry_config = state
        .router
        .as_ref()
        .map(|r| r.retry_config().clone())
        .unwrap_or_default();

    tracing::info!(
        provider_chain = ?provider_chain.iter().map(|p| p.provider()).collect::<Vec<_>>(),
        content_type = %content_type,
        body_size_bytes = %body.len(),
        "hyprnote_batch_transcription_request"
    );

    let mut last_error: Option<String> = None;
    let mut providers_tried = Vec::new();

    for (attempt, selected) in provider_chain.iter().enumerate() {
        let provider = selected.provider();
        providers_tried.push(provider);

        match transcribe_with_retry(
            selected,
            listen_params.clone(),
            body.clone(),
            content_type,
            &retry_config,
        )
        .await
        {
            Ok(response) => {
                tracing::info!(
                    provider = ?provider,
                    attempt = attempt + 1,
                    "batch_transcription_succeeded"
                );

                return Json(response).into_response();
            }
            Err(e) => {
                tracing::warn!(
                    provider = ?provider,
                    error = %e,
                    attempt = attempt + 1,
                    remaining_providers = provider_chain.len() - attempt - 1,
                    "provider_failed_trying_next"
                );

                last_error = Some(e);
            }
        }
    }

    tracing::error!(
        providers_tried = ?providers_tried,
        last_error = ?last_error,
        "all_providers_failed"
    );

    (
        StatusCode::BAD_GATEWAY,
        Json(serde_json::json!({
            "error": "all_providers_failed",
            "detail": last_error.unwrap_or_else(|| "Unknown error".to_string()),
            "providers_tried": providers_tried.iter().map(|p| format!("{:?}", p)).collect::<Vec<_>>()
        })),
    )
        .into_response()
}

async fn transcribe_with_retry(
    selected: &SelectedProvider,
    params: ListenParams,
    audio_bytes: Bytes,
    content_type: &str,
    retry_config: &RetryConfig,
) -> Result<BatchResponse, String> {
    let backoff = ExponentialBuilder::default()
        .with_jitter()
        .with_max_delay(Duration::from_secs(retry_config.max_delay_secs))
        .with_max_times(retry_config.num_retries);

    (|| async {
        transcribe_with_provider(selected, params.clone(), audio_bytes.clone(), content_type).await
    })
    .retry(backoff)
    .notify(|err, dur| {
        tracing::warn!(
            provider = ?selected.provider(),
            error = %err,
            retry_delay_ms = dur.as_millis(),
            "retrying_transcription"
        );
    })
    .when(|e| is_retryable_error(e))
    .await
}

fn build_listen_params(params: &QueryParams) -> ListenParams {
    ListenParams {
        model: params.get_first("model").map(|s| s.to_string()),
        languages: params.get_languages(),
        keywords: params.parse_keywords(),
        ..Default::default()
    }
}

async fn transcribe_with_provider(
    selected: &SelectedProvider,
    params: ListenParams,
    audio_bytes: Bytes,
    content_type: &str,
) -> Result<BatchResponse, String> {
    let temp_file = write_to_temp_file(&audio_bytes, content_type)
        .map_err(|e| format!("failed to create temp file: {}", e))?;

    let file_path = temp_file.path();
    let provider = selected.provider();
    let api_base = provider.default_api_base();
    let api_key = selected.api_key();

    let result = match provider {
        Provider::Deepgram => {
            BatchClient::<DeepgramAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::AssemblyAI => {
            BatchClient::<AssemblyAIAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::Soniox => {
            BatchClient::<SonioxAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::OpenAI => {
            BatchClient::<OpenAIAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::Gladia => {
            BatchClient::<GladiaAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::ElevenLabs => {
            BatchClient::<ElevenLabsAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::Fireworks | Provider::DashScope => {
            return Err(format!(
                "{:?} does not support batch transcription",
                provider
            ));
        }
        Provider::Mistral => {
            BatchClient::<MistralAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
    };

    result.map_err(|e| format!("{:?}", e))
}

fn write_to_temp_file(
    bytes: &Bytes,
    content_type: &str,
) -> Result<tempfile::NamedTempFile, std::io::Error> {
    let extension = content_type_to_extension(content_type);
    let mut temp_file = tempfile::Builder::new()
        .prefix("batch_audio_")
        .suffix(&format!(".{}", extension))
        .tempfile()?;

    temp_file.write_all(bytes)?;
    temp_file.flush()?;

    Ok(temp_file)
}

fn content_type_to_extension(content_type: &str) -> &'static str {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or(content_type)
        .trim();

    match mime {
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav",
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/ogg" => "ogg",
        "audio/flac" => "flac",
        "audio/mp4" | "audio/m4a" | "audio/x-m4a" => "m4a",
        "audio/webm" => "webm",
        "audio/aac" => "aac",
        _ => "wav",
    }
}
