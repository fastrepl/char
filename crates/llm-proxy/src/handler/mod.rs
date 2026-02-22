mod non_streaming;
mod streaming;

use non_streaming::*;
use streaming::*;

use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    Json, Router,
    extract::{FromRequestParts, State},
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
    routing::post,
};
use backon::{ExponentialBuilder, Retryable};
use reqwest::Client;

use crate::analytics::{AnalyticsReporter, GenerationEvent};
use crate::config::LlmProxyConfig;
use crate::model::{CharTask, ModelContext};
use crate::types::{ChatCompletionRequest, ToolChoice};

async fn report_with_cost(
    analytics: &dyn AnalyticsReporter,
    provider: &dyn crate::provider::Provider,
    client: &Client,
    api_key: &str,
    mut event: GenerationEvent,
) {
    event.total_cost = provider
        .fetch_cost(client, api_key, &event.generation_id)
        .await;
    analytics.report_generation(event).await;
}

pub(super) fn spawn_analytics_report(
    analytics: Option<Arc<dyn AnalyticsReporter>>,
    provider: Arc<dyn crate::provider::Provider>,
    client: Client,
    api_key: String,
    event: GenerationEvent,
) {
    if let Some(analytics) = analytics {
        tokio::spawn(async move {
            report_with_cost(&*analytics, &*provider, &client, &api_key, event).await;
        });
    }
}

fn is_retryable_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect()
}

enum ProxyError {
    UpstreamRequest(reqwest::Error),
    Timeout,
    BodyRead(reqwest::Error),
}

impl IntoResponse for ProxyError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::UpstreamRequest(e) => {
                let status_code = e.status().map(|s| s.as_u16());
                let is_timeout = e.is_timeout();
                let is_connect = e.is_connect();
                tracing::error!(
                    error = %e,
                    upstream_status = ?status_code,
                    is_timeout = %is_timeout,
                    is_connect = %is_connect,
                    "upstream_request_failed"
                );
                sentry::configure_scope(|scope| {
                    if let Some(code) = status_code {
                        scope.set_tag("upstream.status", code.to_string());
                    }
                });
                (StatusCode::BAD_GATEWAY, e.to_string())
            }
            Self::Timeout => {
                tracing::error!("upstream_request_timeout");
                sentry::configure_scope(|scope| {
                    scope.set_tag("upstream.status", "timeout");
                });
                (StatusCode::GATEWAY_TIMEOUT, "Request timeout".to_string())
            }
            Self::BodyRead(e) => {
                let is_timeout = e.is_timeout();
                let is_decode = e.is_decode();
                tracing::error!(
                    error = %e,
                    is_timeout = %is_timeout,
                    is_decode = %is_decode,
                    "response_body_read_failed"
                );
                sentry::configure_scope(|scope| {
                    scope.set_tag("upstream.status", "body_read_failed");
                });
                (
                    StatusCode::BAD_GATEWAY,
                    "Failed to read response".to_string(),
                )
            }
        };
        (status, message).into_response()
    }
}

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: LlmProxyConfig,
    pub(crate) client: Client,
}

pub fn router(config: LlmProxyConfig) -> Router {
    let state = AppState {
        config,
        client: Client::new(),
    };

    Router::new()
        .route("/", post(completions_handler))
        .route("/chat/completions", post(completions_handler))
        .with_state(state)
}

pub fn chat_completions_router(config: LlmProxyConfig) -> Router {
    let state = AppState {
        config,
        client: Client::new(),
    };

    Router::new()
        .route("/chat/completions", post(completions_handler))
        .with_state(state)
}

use hypr_analytics::{AuthenticatedUserId, DeviceFingerprint};

pub struct AnalyticsContext {
    pub fingerprint: Option<String>,
    pub user_id: Option<String>,
}

impl<S> FromRequestParts<S> for AnalyticsContext
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let fingerprint = parts
            .extensions
            .get::<DeviceFingerprint>()
            .map(|id| id.0.clone());
        let user_id = parts
            .extensions
            .get::<AuthenticatedUserId>()
            .map(|id| id.0.clone());
        Ok(AnalyticsContext {
            fingerprint,
            user_id,
        })
    }
}

async fn completions_handler(
    State(state): State<AppState>,
    analytics_ctx: AnalyticsContext,
    headers: axum::http::HeaderMap,
    Json(request): Json<ChatCompletionRequest>,
) -> Response {
    let start_time = Instant::now();

    let task = headers
        .get(crate::CHAR_TASK_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<CharTask>().ok());

    let needs_tool_calling = request.tools.as_ref().is_some_and(|t| !t.is_empty())
        && !matches!(&request.tool_choice, Some(ToolChoice::String(s)) if s == "none");

    let ctx = ModelContext {
        task,
        needs_tool_calling,
    };
    let models = state.config.resolve(&ctx);

    let stream = request.stream.unwrap_or(false);

    tracing::info!(
        stream = %stream,
        has_tools = %needs_tool_calling,
        task = ?task,
        message_count = %request.messages.len(),
        model_count = %models.len(),
        provider = %state.config.provider.name(),
        "llm_completion_request_received"
    );

    let provider = &state.config.provider;

    sentry::configure_scope(|scope| {
        scope.set_tag("llm.provider", provider.name());
        if let Some(model) = models.first() {
            scope.set_tag("llm.model", model);
        }
        scope.set_tag("llm.stream", stream.to_string());
        scope.set_tag("llm.tool_calling", needs_tool_calling.to_string());
        if let Some(t) = &task {
            scope.set_tag("llm.task", t.to_string());
        }

        let mut ctx = BTreeMap::new();
        ctx.insert("model_count".into(), models.len().into());
        ctx.insert("message_count".into(), request.messages.len().into());
        ctx.insert("has_tools".into(), needs_tool_calling.into());
        if let Some(t) = &task {
            ctx.insert("task".into(), serde_json::Value::String(t.to_string()));
        }
        scope.set_context("llm_request", sentry::protocol::Context::Other(ctx));
    });

    let provider_request = match provider.build_request(&request, models, stream) {
        Ok(req) => req,
        Err(e) => {
            tracing::error!(error = %e, "failed_to_build_provider_request");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid request").into_response();
        }
    };

    let retry_config = &state.config.retry_config;
    let backoff = ExponentialBuilder::default()
        .with_jitter()
        .with_max_delay(Duration::from_secs(retry_config.max_delay_secs))
        .with_max_times(retry_config.num_retries);

    let result = tokio::time::timeout(state.config.timeout, async {
        (|| async {
            let mut req_builder = state
                .client
                .post(provider.base_url())
                .header("Content-Type", "application/json")
                .header(
                    "Authorization",
                    provider.build_auth_header(&state.config.api_key),
                );

            for (key, value) in provider.additional_headers() {
                req_builder = req_builder.header(key, value);
            }

            req_builder.json(&provider_request).send().await
        })
        .retry(backoff)
        .notify(|err, dur: Duration| {
            tracing::warn!(
                error = %err,
                retry_delay_ms = dur.as_millis(),
                provider = %provider.name(),
                "retrying_llm_request"
            );
        })
        .when(is_retryable_error)
        .await
    })
    .await;

    let response = match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => return ProxyError::UpstreamRequest(e).into_response(),
        Err(_) => return ProxyError::Timeout.into_response(),
    };

    if stream {
        handle_stream_response(state, response, start_time, analytics_ctx).await
    } else {
        handle_non_stream_response(state, response, start_time, analytics_ctx).await
    }
}
