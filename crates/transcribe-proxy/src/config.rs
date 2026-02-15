use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use owhisper_client::Provider;

use crate::analytics::SttAnalyticsReporter;
use crate::env::{ApiKeys, Env};
use crate::hyprnote_routing::{HyprnoteRouter, HyprnoteRoutingConfig};
use crate::provider_selector::ProviderSelector;

pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 7 * 1000;

#[derive(Clone)]
pub struct SttProxyConfig {
    pub api_keys: HashMap<Provider, String>,
    pub default_provider: Provider,
    pub connect_timeout: Duration,
    pub analytics: Option<Arc<dyn SttAnalyticsReporter>>,
    pub upstream_urls: HashMap<Provider, String>,
    pub hyprnote_routing: Option<HyprnoteRoutingConfig>,
    pub supabase_url: Option<String>,
    pub supabase_service_role_key: Option<String>,
    pub api_base_url: Option<String>,
    pub callback_secret: Option<String>,
}

impl SttProxyConfig {
    pub fn new(env: &Env) -> Self {
        Self {
            api_keys: ApiKeys::from(&env.stt).0,
            default_provider: Provider::Deepgram,
            connect_timeout: Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
            analytics: None,
            upstream_urls: HashMap::new(),
            hyprnote_routing: None,
            supabase_url: env.supabase.supabase_url.clone(),
            supabase_service_role_key: env.supabase.supabase_service_role_key.clone(),
            api_base_url: env.callback.api_base_url.clone(),
            callback_secret: env.callback.callback_secret.clone(),
        }
    }

    pub fn with_default_provider(mut self, provider: Provider) -> Self {
        self.default_provider = provider;
        self
    }

    pub fn with_connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    pub fn with_analytics(mut self, analytics: Arc<dyn SttAnalyticsReporter>) -> Self {
        self.analytics = Some(analytics);
        self
    }

    pub fn with_upstream_url(mut self, provider: Provider, url: impl Into<String>) -> Self {
        self.upstream_urls.insert(provider, url.into());
        self
    }

    pub fn with_hyprnote_routing(mut self, config: HyprnoteRoutingConfig) -> Self {
        self.hyprnote_routing = Some(config);
        self
    }

    pub fn provider_selector(&self) -> ProviderSelector {
        ProviderSelector::new(
            self.api_keys.clone(),
            self.default_provider,
            self.upstream_urls.clone(),
        )
    }

    pub fn hyprnote_router(&self) -> Option<HyprnoteRouter> {
        self.hyprnote_routing.clone().map(HyprnoteRouter::new)
    }
}
