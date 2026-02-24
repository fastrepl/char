mod batch;
mod live;

use crate::providers::Provider;

use super::{LanguageQuality, LanguageSupport};

const AZURE_API_VERSION: &str = "2025-04-01-preview";

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Clone)]
pub struct OpenAIAdapter {
    is_azure: Arc<AtomicBool>,
}

impl Default for OpenAIAdapter {
    fn default() -> Self {
        Self {
            is_azure: Arc::new(AtomicBool::new(false)),
        }
    }
}

impl OpenAIAdapter {
    pub fn set_azure(&self, value: bool) {
        self.is_azure.store(value, Ordering::SeqCst);
    }

    pub fn is_azure(&self) -> bool {
        self.is_azure.load(Ordering::SeqCst)
    }
}

impl OpenAIAdapter {
    pub fn language_support_live(_languages: &[hypr_language::Language]) -> LanguageSupport {
        LanguageSupport::Supported {
            quality: LanguageQuality::NoData,
        }
    }

    pub fn language_support_batch(_languages: &[hypr_language::Language]) -> LanguageSupport {
        Self::language_support_live(_languages)
    }

    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_live(languages).is_supported()
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_batch(languages).is_supported()
    }

    pub fn is_azure_host(host: &str) -> bool {
        host.ends_with(".openai.azure.com")
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        Self::build_ws_url_from_base_with_model(api_base, None)
    }

    pub(crate) fn build_ws_url_from_base_with_model(
        api_base: &str,
        model: Option<&str>,
    ) -> (url::Url, Vec<(String, String)>) {
        if api_base.is_empty() {
            return (
                Provider::OpenAI
                    .default_ws_url()
                    .parse()
                    .expect("invalid_default_ws_url"),
                vec![("intent".to_string(), "transcription".to_string())],
            );
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        let host = parsed
            .host_str()
            .unwrap_or(Provider::OpenAI.default_ws_host());

        if Self::is_azure_host(host) {
            return Self::build_azure_ws_url(&parsed, host, model);
        }

        let mut existing_params = super::extract_query_params(&parsed);

        if !existing_params.iter().any(|(k, _)| k == "intent") {
            existing_params.push(("intent".to_string(), "transcription".to_string()));
        }

        let mut url: url::Url = format!("wss://{}{}", host, Provider::OpenAI.ws_path())
            .parse()
            .expect("invalid_ws_url");

        super::set_scheme_from_host(&mut url);

        (url, existing_params)
    }

    fn build_azure_ws_url(
        parsed: &url::Url,
        host: &str,
        _model: Option<&str>,
    ) -> (url::Url, Vec<(String, String)>) {
        // For Azure transcription Realtime API:
        // - deployment/model should NOT be in URL (causes 400 error)
        // - deployment must be sent in transcription_session.update message
        // - Only api-version and intent go in the URL

        let url: url::Url = format!("wss://{}/openai/realtime", host)
            .parse()
            .expect("invalid_azure_ws_url");

        let params = vec![
            ("api-version".to_string(), AZURE_API_VERSION.to_string()),
            ("intent".to_string(), "transcription".to_string()),
        ];

        (url, params)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base_empty() {
        let (url, params) = OpenAIAdapter::build_ws_url_from_base("");
        assert_eq!(url.as_str(), "wss://api.openai.com/v1/realtime");
        assert_eq!(
            params,
            vec![("intent".to_string(), "transcription".to_string())]
        );
    }

    #[test]
    fn test_build_ws_url_from_base_proxy() {
        let (url, params) =
            OpenAIAdapter::build_ws_url_from_base("https://api.hyprnote.com?provider=openai");
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/listen");
        assert_eq!(params, vec![("provider".to_string(), "openai".to_string())]);
    }

    #[test]
    fn test_build_ws_url_from_base_localhost() {
        let (url, params) =
            OpenAIAdapter::build_ws_url_from_base("http://localhost:8787?provider=openai");
        assert_eq!(url.as_str(), "ws://localhost:8787/listen");
        assert_eq!(params, vec![("provider".to_string(), "openai".to_string())]);
    }

    #[test]
    fn test_is_openai_host() {
        assert!(Provider::OpenAI.is_host("api.openai.com"));
        assert!(Provider::OpenAI.is_host("openai.com"));
        assert!(!Provider::OpenAI.is_host("api.deepgram.com"));
    }

    #[test]
    fn test_is_azure_host() {
        assert!(OpenAIAdapter::is_azure_host("my-resource.openai.azure.com"));
        assert!(OpenAIAdapter::is_azure_host("eastus.openai.azure.com"));
        assert!(!OpenAIAdapter::is_azure_host("api.openai.com"));
        assert!(!OpenAIAdapter::is_azure_host("openai.com"));
        assert!(!OpenAIAdapter::is_azure_host("azure.com"));
    }

    #[test]
    fn test_build_ws_url_azure() {
        // Azure transcription: deployment should NOT be in URL
        // Only api-version and intent should be in params
        let (url, params) = OpenAIAdapter::build_ws_url_from_base_with_model(
            "https://my-resource.openai.azure.com",
            Some("gpt-4o-realtime-preview"),
        );
        assert_eq!(
            url.as_str(),
            "wss://my-resource.openai.azure.com/openai/realtime"
        );
        assert!(
            params
                .iter()
                .any(|(k, v)| k == "api-version" && v == "2025-04-01-preview")
        );
        assert!(
            params
                .iter()
                .any(|(k, v)| k == "intent" && v == "transcription")
        );
        // deployment should NOT be in URL params
        assert!(!params.iter().any(|(k, _)| k == "deployment"));
    }

    #[test]
    fn test_build_ws_url_azure_deployment_not_in_url() {
        // Even if deployment is in input URL, it should not appear in output params
        // (deployment goes in session message, not URL)
        let (url, params) = OpenAIAdapter::build_ws_url_from_base_with_model(
            "https://my-resource.openai.azure.com?deployment=my-deployment",
            None,
        );
        assert_eq!(
            url.as_str(),
            "wss://my-resource.openai.azure.com/openai/realtime"
        );
        // deployment should NOT be in URL params
        assert!(!params.iter().any(|(k, _)| k == "deployment"));
        assert!(
            params
                .iter()
                .any(|(k, v)| k == "api-version" && v == "2025-04-01-preview")
        );
        assert!(
            params
                .iter()
                .any(|(k, v)| k == "intent" && v == "transcription")
        );
    }
}
