mod batch;
pub mod callback;
mod error;
pub mod start;
pub mod status;
pub mod streaming;

use std::sync::Arc;

use axum::{
    Router,
    extract::{DefaultBodyLimit, FromRequestParts},
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use owhisper_client::Provider;

use crate::config::SttProxyConfig;
use crate::hyprnote_routing::{HyprnoteRouter, should_use_hyprnote_routing};
use crate::provider_selector::{ProviderSelector, SelectedProvider};
use crate::query_params::QueryParams;
use crate::supabase::SupabaseClient;

pub(crate) use error::{RouteError, parse_async_provider};

#[derive(Clone)]
pub(crate) struct AppState {
    pub config: SttProxyConfig,
    pub selector: ProviderSelector,
    pub router: Option<Arc<HyprnoteRouter>>,
    pub client: reqwest::Client,
}

impl FromRequestParts<AppState> for SupabaseClient {
    type Rejection = RouteError;

    async fn from_request_parts(
        _parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        Ok(Self {
            client: state.client.clone(),
            url: state
                .config
                .supabase_url
                .clone()
                .ok_or(RouteError::MissingConfig("supabase_url not configured"))?,
            service_role_key: state.config.supabase_service_role_key.clone().ok_or(
                RouteError::MissingConfig("supabase_service_role_key not configured"),
            )?,
        })
    }
}

impl AppState {
    #[allow(clippy::result_large_err)]
    pub fn resolve_provider(&self, params: &mut QueryParams) -> Result<SelectedProvider, Response> {
        let provider_param = params.remove_first("provider");

        if should_use_hyprnote_routing(provider_param.as_deref()) {
            return self.resolve_hyprnote_provider(params);
        }

        let requested = match provider_param {
            Some(s) => match s.parse::<Provider>() {
                Ok(p) => Some(p),
                Err(_) => {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        format!("Invalid provider: {}. Supported providers: deepgram, soniox, assemblyai, gladia, elevenlabs, fireworks, openai", s)
                    ).into_response());
                }
            },
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "provider parameter is required. Use provider=hyprnote for hyprnote routing or provider=<provider_name> for a specific provider"
                ).into_response());
            }
        };

        self.selector.select(requested).map_err(|e| {
            tracing::warn!(
                error = %e,
                requested_provider = ?requested,
                "provider_selection_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }

    #[allow(clippy::result_large_err)]
    fn resolve_hyprnote_provider(
        &self,
        params: &QueryParams,
    ) -> Result<SelectedProvider, Response> {
        let router = self.router.as_ref().ok_or_else(|| {
            tracing::warn!("hyprnote_routing_not_configured");
            (
                StatusCode::BAD_REQUEST,
                "hyprnote routing is not configured",
            )
                .into_response()
        })?;

        let languages = params.get_languages();
        let available_providers = self.selector.available_providers();
        let routed_provider = router.select_provider(&languages, &available_providers);

        tracing::debug!(
            languages = ?languages,
            available_providers = ?available_providers,
            routed_provider = ?routed_provider,
            "hyprnote_routing"
        );

        self.selector.select(routed_provider).map_err(|e| {
            tracing::warn!(
                error = %e,
                languages = ?languages,
                "hyprnote_routing_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }

    pub fn resolve_hyprnote_provider_chain(&self, params: &QueryParams) -> Vec<SelectedProvider> {
        let Some(router) = self.router.as_ref() else {
            return vec![];
        };

        let languages = params.get_languages();
        let available_providers = self.selector.available_providers();

        router
            .select_provider_chain(&languages, &available_providers)
            .into_iter()
            .filter_map(|p| self.selector.select(Some(p)).ok())
            .collect()
    }
}

fn make_state(config: SttProxyConfig) -> AppState {
    let selector = config.provider_selector();
    let router = config.hyprnote_router().map(Arc::new);

    AppState {
        config,
        selector,
        router,
        client: reqwest::Client::new(),
    }
}

fn with_common_layers(router: Router) -> Router {
    router.layer(DefaultBodyLimit::max(100 * 1024 * 1024))
}

pub fn router(config: SttProxyConfig) -> Router {
    let state = make_state(config);

    with_common_layers(
        Router::new()
            .route("/", get(streaming::handler))
            .route("/", post(batch::handler))
            .route("/listen", get(streaming::handler))
            .route("/listen", post(batch::handler))
            .route("/start", post(start::handler))
            .route("/status/{pipeline_id}", get(status::handler))
            .with_state(state),
    )
}

pub fn listen_router(config: SttProxyConfig) -> Router {
    let state = make_state(config);

    with_common_layers(
        Router::new()
            .route("/listen", get(streaming::handler))
            .route("/listen", post(batch::handler))
            .with_state(state),
    )
}

pub fn callback_router(config: SttProxyConfig) -> Router {
    let state = make_state(config);

    Router::new()
        .route("/callback/{provider}/{id}", post(callback::handler))
        .with_state(state)
}
