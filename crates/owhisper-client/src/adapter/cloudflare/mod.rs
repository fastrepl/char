mod batch;
mod live;

use crate::providers::Provider;

use super::{LanguageQuality, LanguageSupport};

#[derive(Clone, Default)]
pub struct CloudflareAdapter;

impl CloudflareAdapter {
    pub fn language_support_live(_languages: &[hypr_language::Language]) -> LanguageSupport {
        LanguageSupport::NotSupported
    }

    pub fn language_support_batch(_languages: &[hypr_language::Language]) -> LanguageSupport {
        LanguageSupport::Supported {
            quality: LanguageQuality::NoData,
        }
    }

    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_live(languages).is_supported()
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_batch(languages).is_supported()
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        // Cloudflare Workers AI does not support WebSocket-based realtime transcription.
        // Return a dummy URL that will never actually be used.
        super::build_ws_url_from_base_with(Provider::Cloudflare, api_base, |parsed| {
            let host = parsed
                .host_str()
                .unwrap_or(Provider::Cloudflare.default_ws_host());
            let mut url: url::Url = format!("wss://{}{}", host, Provider::Cloudflare.ws_path())
                .parse()
                .expect("invalid_ws_url");
            super::set_scheme_from_host(&mut url);
            url
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_live_not_supported() {
        let langs: Vec<hypr_language::Language> = vec![hypr_language::ISO639::En.into()];
        assert!(!CloudflareAdapter::is_supported_languages_live(&langs));
    }

    #[test]
    fn test_batch_supported() {
        let langs: Vec<hypr_language::Language> = vec![hypr_language::ISO639::En.into()];
        assert!(CloudflareAdapter::is_supported_languages_batch(&langs));
    }

    #[test]
    fn test_is_cloudflare_host() {
        assert!(Provider::Cloudflare.is_host("api.cloudflare.com"));
        assert!(Provider::Cloudflare.is_host("cloudflare.com"));
        assert!(!Provider::Cloudflare.is_host("api.openai.com"));
    }
}
