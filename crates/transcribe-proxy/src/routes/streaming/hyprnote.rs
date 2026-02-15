use std::str::FromStr;

use owhisper_client::{
    AdapterKind, AssemblyAIAdapter, Auth, DashScopeAdapter, DeepgramAdapter, DeepgramModel,
    ElevenLabsAdapter, FireworksAdapter, GladiaAdapter, MistralAdapter, OpenAIAdapter, Provider,
    RealtimeSttAdapter, SonioxAdapter,
};
use owhisper_interface::ListenParams;

use crate::config::SttProxyConfig;
use crate::provider_selector::SelectedProvider;
use crate::query_params::{QueryParams, QueryValue};
use crate::relay::WebSocketProxy;
use crate::routes::AppState;

use super::AnalyticsContext;
use super::common::{ProxyBuildError, build_proxy_with_url, finalize_proxy_builder, parse_param};
use super::session::init_session;

fn build_listen_params(params: &QueryParams) -> ListenParams {
    let model = params.get_first("model").map(|s| s.to_string());
    let languages = params.get_languages();
    let sample_rate: u32 = parse_param(params, "sample_rate", 16000);
    let channels: u8 = parse_param(params, "channels", 1);

    let keywords: Vec<String> = params
        .get("keyword")
        .or_else(|| params.get("keywords"))
        .map(|v| match v {
            QueryValue::Single(s) => s.split(',').map(|k| k.trim().to_string()).collect(),
            QueryValue::Multi(vec) => vec.iter().map(|k| k.trim().to_string()).collect(),
        })
        .unwrap_or_default();

    ListenParams {
        model,
        languages,
        sample_rate,
        channels,
        keywords,
        ..Default::default()
    }
}

fn build_upstream_url_with_adapter(
    provider: Provider,
    api_base: &str,
    params: &ListenParams,
    channels: u8,
) -> url::Url {
    match provider {
        Provider::Deepgram => DeepgramAdapter.build_ws_url(api_base, params, channels),
        Provider::AssemblyAI => AssemblyAIAdapter.build_ws_url(api_base, params, channels),
        Provider::Soniox => SonioxAdapter.build_ws_url(api_base, params, channels),
        Provider::Fireworks => FireworksAdapter.build_ws_url(api_base, params, channels),
        Provider::OpenAI => OpenAIAdapter.build_ws_url(api_base, params, channels),
        Provider::Gladia => GladiaAdapter.build_ws_url(api_base, params, channels),
        Provider::ElevenLabs => ElevenLabsAdapter.build_ws_url(api_base, params, channels),
        Provider::DashScope => DashScopeAdapter.build_ws_url(api_base, params, channels),
        Provider::Mistral => MistralAdapter::default().build_ws_url(api_base, params, channels),
    }
}

fn build_initial_message_with_adapter(
    provider: Provider,
    api_key: Option<&str>,
    params: &ListenParams,
    channels: u8,
) -> Option<String> {
    let msg = match provider {
        Provider::Deepgram => DeepgramAdapter.initial_message(api_key, params, channels),
        Provider::AssemblyAI => AssemblyAIAdapter.initial_message(api_key, params, channels),
        Provider::Soniox => SonioxAdapter.initial_message(api_key, params, channels),
        Provider::Fireworks => FireworksAdapter.initial_message(api_key, params, channels),
        Provider::OpenAI => OpenAIAdapter.initial_message(api_key, params, channels),
        Provider::Gladia => GladiaAdapter.initial_message(api_key, params, channels),
        Provider::ElevenLabs => ElevenLabsAdapter.initial_message(api_key, params, channels),
        Provider::DashScope => DashScopeAdapter.initial_message(api_key, params, channels),
        Provider::Mistral => MistralAdapter::default().initial_message(api_key, params, channels),
    };

    msg.and_then(|m| match m {
        owhisper_client::hypr_ws_client::client::Message::Text(t) => Some(t.to_string()),
        _ => None,
    })
}

fn build_response_transformer(
    provider: Provider,
) -> impl Fn(&str) -> Option<String> + Send + Sync + 'static {
    let mistral_adapter = MistralAdapter::default();
    move |raw: &str| {
        let responses: Vec<owhisper_interface::stream::StreamResponse> = match provider {
            Provider::Deepgram => DeepgramAdapter.parse_response(raw),
            Provider::AssemblyAI => AssemblyAIAdapter.parse_response(raw),
            Provider::Soniox => SonioxAdapter.parse_response(raw),
            Provider::Fireworks => FireworksAdapter.parse_response(raw),
            Provider::OpenAI => OpenAIAdapter.parse_response(raw),
            Provider::Gladia => GladiaAdapter.parse_response(raw),
            Provider::ElevenLabs => ElevenLabsAdapter.parse_response(raw),
            Provider::DashScope => DashScopeAdapter.parse_response(raw),
            Provider::Mistral => mistral_adapter.parse_response(raw),
        };

        if responses.is_empty() {
            return None;
        }

        if responses.len() == 1 {
            return serde_json::to_string(&responses[0]).ok();
        }

        serde_json::to_string(&responses).ok()
    }
}

fn should_override_deepgram_model(model: &str, languages: &[hypr_language::Language]) -> bool {
    if let Ok(parsed_model) = DeepgramModel::from_str(model) {
        !languages
            .iter()
            .all(|lang| parsed_model.supports_language(lang))
    } else {
        false
    }
}

fn build_proxy_with_adapter(
    selected: &SelectedProvider,
    client_params: &QueryParams,
    config: &SttProxyConfig,
    analytics_ctx: AnalyticsContext,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = selected.provider();
    let mut listen_params = build_listen_params(client_params);
    let channels: u8 = parse_param(client_params, "channels", 1);

    let should_override = match (provider, &listen_params.model) {
        (Provider::Deepgram, Some(model)) => {
            should_override_deepgram_model(model, &listen_params.languages)
        }
        _ => false,
    };

    if (listen_params.model.is_none() || should_override)
        && let Some(model) =
            AdapterKind::from(provider).recommended_model_live(&listen_params.languages)
    {
        listen_params.model = Some(model.to_string());
    }

    let api_base = provider.default_api_base();
    let upstream_url =
        build_upstream_url_with_adapter(provider, api_base, &listen_params, channels);

    let initial_message = build_initial_message_with_adapter(
        provider,
        Some(selected.api_key()),
        &listen_params,
        channels,
    );

    let mut builder = WebSocketProxy::builder()
        .upstream_url(upstream_url.as_str())
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .response_transformer(build_response_transformer(provider))
        .apply_auth(selected);

    if let Some(msg) = initial_message {
        builder = builder.initial_message(msg);
    }

    finalize_proxy_builder!(builder, provider, config, analytics_ctx)
}

fn build_proxy_with_url_and_transformer(
    selected: &SelectedProvider,
    upstream_url: &str,
    config: &SttProxyConfig,
    analytics_ctx: AnalyticsContext,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = selected.provider();
    let builder = WebSocketProxy::builder()
        .upstream_url(upstream_url)
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .response_transformer(build_response_transformer(provider))
        .apply_auth(selected);

    finalize_proxy_builder!(builder, provider, config, analytics_ctx)
}

pub async fn build_proxy(
    state: &AppState,
    selected: &SelectedProvider,
    params: &QueryParams,
    analytics_ctx: AnalyticsContext,
) -> Result<WebSocketProxy, ProxyBuildError> {
    let provider = selected.provider();

    if let Some(custom_url) = selected.upstream_url() {
        return Ok(build_proxy_with_url(
            selected,
            custom_url,
            &state.config,
            analytics_ctx,
        )?);
    }

    match provider.auth() {
        Auth::SessionInit { header_name } => {
            let url = init_session(state, selected, header_name, params)
                .await
                .map_err(ProxyBuildError::SessionInitFailed)?;
            let proxy =
                build_proxy_with_url_and_transformer(selected, &url, &state.config, analytics_ctx)?;
            Ok(proxy)
        }
        _ => Ok(build_proxy_with_adapter(
            selected,
            params,
            &state.config,
            analytics_ctx,
        )?),
    }
}

#[cfg(test)]
pub mod test_helpers {
    use super::*;

    pub fn build_listen_params(params: &QueryParams) -> ListenParams {
        super::build_listen_params(params)
    }

    pub fn build_upstream_url_with_adapter(
        provider: Provider,
        api_base: &str,
        params: &ListenParams,
        channels: u8,
    ) -> url::Url {
        super::build_upstream_url_with_adapter(provider, api_base, params, channels)
    }

    pub fn build_initial_message_with_adapter(
        provider: Provider,
        api_key: Option<&str>,
        params: &ListenParams,
        channels: u8,
    ) -> Option<String> {
        super::build_initial_message_with_adapter(provider, api_key, params, channels)
    }

    pub fn build_response_transformer(
        provider: Provider,
    ) -> impl Fn(&str) -> Option<String> + Send + Sync + 'static {
        super::build_response_transformer(provider)
    }
}
