use std::sync::Arc;
use std::time::Duration;

use crate::analytics::AnalyticsReporter;
use crate::env::ApiKey;
use crate::provider::{OpenRouterProvider, Provider};

const DEFAULT_TIMEOUT_MS: u64 = 120_000;
const DEFAULT_NUM_RETRIES: usize = 1;
const DEFAULT_MAX_DELAY_SECS: u64 = 2;

#[derive(Clone)]
pub struct RetryConfig {
    pub num_retries: usize,
    pub max_delay_secs: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            num_retries: DEFAULT_NUM_RETRIES,
            max_delay_secs: DEFAULT_MAX_DELAY_SECS,
        }
    }
}

#[derive(Clone)]
pub struct LlmProxyConfig {
    pub api_key: String,
    pub timeout: Duration,
    pub models_tool_calling: Vec<String>,
    pub models_default: Vec<String>,
    pub analytics: Option<Arc<dyn AnalyticsReporter>>,
    pub provider: Arc<dyn Provider>,
    pub retry_config: RetryConfig,
}

impl LlmProxyConfig {
    pub fn new(api_key: impl Into<ApiKey>) -> Self {
        Self {
            api_key: api_key.into().0,
            timeout: Duration::from_millis(DEFAULT_TIMEOUT_MS),
            models_tool_calling: vec![
                "anthropic/claude-haiku-4.5".into(),
                "openai/gpt-oss-120b:exacto".into(),
                "moonshotai/kimi-k2-0905:exacto".into(),
            ],
            models_default: vec![
                "anthropic/claude-sonnet-4.5".into(),
                "openai/gpt-5.2-chat".into(),
                "moonshotai/kimi-k2-0905".into(),
            ],
            analytics: None,
            provider: Arc::new(OpenRouterProvider::default()),
            retry_config: RetryConfig::default(),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_models_tool_calling(mut self, models: Vec<String>) -> Self {
        self.models_tool_calling = models;
        self
    }

    pub fn with_models_default(mut self, models: Vec<String>) -> Self {
        self.models_default = models;
        self
    }

    pub fn with_analytics(mut self, reporter: Arc<dyn AnalyticsReporter>) -> Self {
        self.analytics = Some(reporter);
        self
    }

    pub fn with_provider(mut self, provider: Arc<dyn Provider>) -> Self {
        self.provider = provider;
        self
    }

    pub fn with_retry_config(mut self, retry_config: RetryConfig) -> Self {
        self.retry_config = retry_config;
        self
    }
}
