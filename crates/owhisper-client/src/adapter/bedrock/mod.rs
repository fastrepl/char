mod batch;
mod live;

use crate::providers::Provider;

use super::{LanguageQuality, LanguageSupport};

#[derive(Clone, Default)]
pub struct BedrockAdapter;

impl BedrockAdapter {
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

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        // Bedrock Mantle is OpenAI-compatible and uses the same Realtime API surface.
        // We follow the OpenAI adapter's URL behavior (including intent=transcription).
        if api_base.is_empty() {
            return (
                Provider::Bedrock
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
        let mut existing_params = super::extract_query_params(&parsed);

        if !existing_params.iter().any(|(k, _)| k == "intent") {
            existing_params.push(("intent".to_string(), "transcription".to_string()));
        }

        let host = parsed
            .host_str()
            .unwrap_or(Provider::Bedrock.default_ws_host());
        let mut url: url::Url = format!("wss://{}{}", host, Provider::Bedrock.ws_path())
            .parse()
            .expect("invalid_ws_url");

        super::set_scheme_from_host(&mut url);

        (url, existing_params)
    }
}
