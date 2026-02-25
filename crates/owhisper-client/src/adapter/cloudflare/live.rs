use hypr_ws_client::client::Message;
use owhisper_interface::ListenParams;
use owhisper_interface::stream::StreamResponse;

use super::CloudflareAdapter;
use crate::adapter::RealtimeSttAdapter;

// Cloudflare Workers AI does not support WebSocket-based realtime transcription.
// This implementation provides a minimal stub so that the adapter compiles in
// contexts that require `RealtimeSttAdapter`. Actual transcription should go
// through the batch (`BatchSttAdapter`) path.
impl RealtimeSttAdapter for CloudflareAdapter {
    fn provider_name(&self) -> &'static str {
        "cloudflare"
    }

    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        CloudflareAdapter::is_supported_languages_live(languages)
    }

    fn supports_native_multichannel(&self) -> bool {
        false
    }

    fn build_ws_url(&self, api_base: &str, _params: &ListenParams, _channels: u8) -> url::Url {
        let (url, _) = Self::build_ws_url_from_base(api_base);
        url
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        api_key.and_then(|k| crate::providers::Provider::Cloudflare.build_auth_header(k))
    }

    fn keep_alive_message(&self) -> Option<Message> {
        None
    }

    fn finalize_message(&self) -> Message {
        Message::Text("".into())
    }

    fn parse_response(&self, _raw: &str) -> Vec<StreamResponse> {
        vec![]
    }
}
