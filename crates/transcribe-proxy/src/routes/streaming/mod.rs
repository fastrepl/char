mod common;
mod hyprnote;
mod passthrough;
mod session;

use std::collections::BTreeMap;

use axum::{
    extract::{FromRequestParts, State, WebSocketUpgrade},
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};

use crate::hyprnote_routing::should_use_hyprnote_routing;
use crate::query_params::{QueryParams, QueryValue};

use super::AppState;
use common::{ProxyBuildError, parse_param};

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

pub async fn handler(
    State(state): State<AppState>,
    analytics_ctx: AnalyticsContext,
    ws: WebSocketUpgrade,
    mut params: QueryParams,
) -> Response {
    let is_hyprnote_routing = should_use_hyprnote_routing(params.get_first("provider"));

    let selected = match state.resolve_provider(&mut params) {
        Ok(v) => v,
        Err(resp) => return resp,
    };

    let provider = selected.provider();
    let provider_name = format!("{:?}", provider).to_lowercase();

    sentry::configure_scope(|scope| {
        scope.set_tag("stt.provider", &provider_name);
        scope.set_tag(
            "stt.routing",
            if is_hyprnote_routing {
                "hyprnote"
            } else {
                "direct"
            },
        );

        if let Some(model) = params.get_first("model") {
            scope.set_tag("stt.model", model);
        }

        let languages: Vec<_> = params
            .get_languages()
            .iter()
            .map(|l| l.iso639().to_string())
            .collect();
        if !languages.is_empty() {
            scope.set_tag("stt.languages", languages.join(","));
        }

        let sample_rate: u32 = parse_param(&params, "sample_rate", 16000);
        let channels: u8 = parse_param(&params, "channels", 1);
        let keywords = params
            .get("keyword")
            .or_else(|| params.get("keywords"))
            .map(|v| match v {
                QueryValue::Single(s) => s.split(',').count(),
                QueryValue::Multi(vec) => vec.len(),
            })
            .unwrap_or(0);

        let mut ctx = BTreeMap::new();
        ctx.insert("sample_rate".into(), sample_rate.into());
        ctx.insert("channels".into(), channels.into());
        ctx.insert("keywords_count".into(), keywords.into());
        ctx.insert("languages_count".into(), languages.len().into());
        scope.set_context("stt_request", sentry::protocol::Context::Other(ctx));
    });

    let proxy = if is_hyprnote_routing {
        hyprnote::build_proxy(&state, &selected, &params, analytics_ctx).await
    } else {
        passthrough::build_proxy(&state, &selected, &params, analytics_ctx).await
    };

    let proxy = match proxy {
        Ok(p) => p,
        Err(ProxyBuildError::SessionInitFailed(e)) => {
            tracing::error!(
                error = %e,
                provider = ?selected.provider(),
                "session_init_failed"
            );
            sentry::configure_scope(|scope| {
                scope.set_tag("upstream.status", "session_init_failed");
            });
            return (StatusCode::BAD_GATEWAY, e).into_response();
        }
        Err(ProxyBuildError::ProxyError(e)) => {
            tracing::error!(
                error = ?e,
                provider = ?provider,
                "proxy_build_failed"
            );
            sentry::configure_scope(|scope| {
                scope.set_tag("upstream.status", "proxy_build_failed");
            });
            return (StatusCode::BAD_REQUEST, format!("{}", e)).into_response();
        }
    };

    proxy.handle_upgrade(ws).await.into_response()
}
