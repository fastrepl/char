use std::time::Duration;

use axum::{
    Json,
    body::Bytes,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use backon::{ExponentialBuilder, Retryable};
use owhisper_client::{
    AssemblyAIAdapter, BatchClient, BedrockAdapter, DeepgramAdapter, ElevenLabsAdapter,
    GladiaAdapter, MistralAdapter, OpenAIAdapter, Provider, SonioxAdapter,
};
use owhisper_interface::ListenParams;
use owhisper_interface::batch::Response as BatchResponse;

use crate::hyprnote_routing::{RetryConfig, is_retryable_error};
use crate::provider_selector::SelectedProvider;
use crate::query_params::QueryParams;

use super::super::AppState;
use super::super::model_resolution::resolve_model;
use super::write_to_temp_file;

fn resolve_listen_params_for_provider(
    provider: Provider,
    listen_params: &ListenParams,
) -> ListenParams {
    let mut resolved_params = listen_params.clone();
    resolve_model(provider, &mut resolved_params);
    resolved_params
}

pub(super) async fn handle_hyprnote_batch(
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
        let provider_listen_params = resolve_listen_params_for_provider(provider, &listen_params);
        providers_tried.push(provider);

        match transcribe_with_retry(
            selected,
            provider_listen_params,
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

pub(super) async fn transcribe_with_provider(
    selected: &SelectedProvider,
    params: ListenParams,
    audio_bytes: Bytes,
    content_type: &str,
) -> Result<BatchResponse, String> {
    let temp_file = write_to_temp_file(&audio_bytes, content_type)
        .map_err(|e| format!("failed to create temp file: {}", e))?;

    let file_path = temp_file.path();
    let provider = selected.provider();
    let api_base = selected
        .upstream_url()
        .unwrap_or(provider.default_api_base());
    let api_key = selected.api_key();

    macro_rules! batch_transcribe {
        ($adapter:ty) => {
            BatchClient::<$adapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        };
    }

    let result = match provider {
        Provider::Deepgram => batch_transcribe!(DeepgramAdapter),
        Provider::AssemblyAI => batch_transcribe!(AssemblyAIAdapter),
        Provider::Soniox => batch_transcribe!(SonioxAdapter),
        Provider::OpenAI => batch_transcribe!(OpenAIAdapter),
        Provider::Gladia => batch_transcribe!(GladiaAdapter),
        Provider::ElevenLabs => batch_transcribe!(ElevenLabsAdapter),
        Provider::Mistral => batch_transcribe!(MistralAdapter),
        Provider::Bedrock => batch_transcribe!(BedrockAdapter),
        Provider::Fireworks | Provider::DashScope => {
            return Err(format!(
                "{:?} does not support batch transcription",
                provider
            ));
        }
    };

    result.map_err(|e| format!("{:?}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use hypr_language::ISO639;

    #[test]
    fn test_resolve_listen_params_for_provider_resolves_meta_model_per_provider() {
        let params = ListenParams {
            model: Some("cloud".to_string()),
            languages: vec![ISO639::En.into()],
            ..Default::default()
        };

        let deepgram_params = resolve_listen_params_for_provider(Provider::Deepgram, &params);
        assert!(deepgram_params.model.is_some());
        assert_ne!(deepgram_params.model.as_deref(), Some("cloud"));

        let soniox_params = resolve_listen_params_for_provider(Provider::Soniox, &params);
        assert_eq!(soniox_params.model, None);

        assert_eq!(params.model.as_deref(), Some("cloud"));
    }
}
