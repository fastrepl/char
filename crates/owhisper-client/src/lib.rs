mod adapter;
mod batch;
mod error;
mod error_detection;
mod http_client;
mod live;
pub(crate) mod polling;
mod providers;

#[cfg(test)]
pub(crate) mod test_utils;

pub use error_detection::ProviderError;
pub use providers::{Auth, Provider, is_meta_model};

use std::marker::PhantomData;

pub use adapter::deepgram::DeepgramModel;
pub use adapter::{
    AdapterKind, ArgmaxAdapter, AssemblyAIAdapter, BatchSttAdapter, CallbackResult,
    CallbackSttAdapter, DashScopeAdapter, DeepgramAdapter, ElevenLabsAdapter, FireworksAdapter,
    GladiaAdapter, HyprnoteAdapter, LanguageQuality, LanguageSupport, MistralAdapter,
    OpenAIAdapter, RealtimeSttAdapter, SonioxAdapter, append_provider_param,
    documented_language_codes_batch, documented_language_codes_live, is_hyprnote_proxy,
    is_local_host, normalize_languages,
};
#[cfg(feature = "argmax")]
pub use adapter::{StreamingBatchConfig, StreamingBatchEvent, StreamingBatchStream};

pub use batch::{BatchClient, BatchClientBuilder};
pub use error::Error;
pub use hypr_ws_client;
pub use live::{DualHandle, FinalizeHandle, ListenClient, ListenClientDual};

pub struct ListenClientBuilder<A: RealtimeSttAdapter = DeepgramAdapter> {
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<owhisper_interface::ListenParams>,
    extra_headers: Vec<(String, String)>,
    _marker: PhantomData<A>,
}

impl Default for ListenClientBuilder {
    fn default() -> Self {
        Self {
            api_base: None,
            api_key: None,
            params: None,
            extra_headers: Vec::new(),
            _marker: PhantomData,
        }
    }
}

impl<A: RealtimeSttAdapter> ListenClientBuilder<A> {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn params(mut self, params: owhisper_interface::ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    pub fn extra_header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.extra_headers.push((name.into(), value.into()));
        self
    }

    pub fn adapter<B: RealtimeSttAdapter>(self) -> ListenClientBuilder<B> {
        ListenClientBuilder {
            api_base: self.api_base,
            api_key: self.api_key,
            params: self.params,
            extra_headers: self.extra_headers,
            _marker: PhantomData,
        }
    }

    fn get_api_base(&self) -> &str {
        self.api_base.as_ref().expect("api_base is required")
    }

    fn get_params(&self) -> owhisper_interface::ListenParams {
        let mut params = self.params.clone().unwrap_or_default();
        params.languages = adapter::normalize_languages(&params.languages);
        params
    }

    async fn build_request(
        &self,
        adapter: &A,
        channels: u8,
    ) -> hypr_ws_client::client::ClientRequestBuilder {
        let mut params = self.get_params();
        let original_api_base = self.get_api_base();

        // HACK: When going through hyprnote proxy, meta models like "cloud" aren't
        // real provider models. Resolve to actual provider model (e.g., "nova-3")
        // so that language strategies like can_use_multi() work correctly.
        // This will go away once we migrate to using the HyprnoteAdapter directly.
        if is_hyprnote_proxy(original_api_base)
            && params.model.as_deref().map_or(true, is_meta_model)
        {
            let adapter_kind = AdapterKind::from_url_and_languages(
                original_api_base,
                &params.languages,
                params.model.as_deref(),
            );
            if let Some(recommended) = adapter_kind.recommended_model_live(&params.languages) {
                params.model = Some(recommended.to_string());
            }
        }

        let api_base = append_provider_param(original_api_base, adapter.provider_name());
        let url = adapter
            .build_ws_url_with_api_key(&api_base, &params, channels, self.api_key.as_deref())
            .await
            .unwrap_or_else(|| adapter.build_ws_url(&api_base, &params, channels));
        let uri = url.to_string().parse().unwrap();

        let mut request = hypr_ws_client::client::ClientRequestBuilder::new(uri);

        if is_hyprnote_proxy(original_api_base) {
            if let Some(api_key) = self.api_key.as_deref() {
                request = request.with_header("Authorization", format!("Bearer {}", api_key));
            }
            for (name, value) in &self.extra_headers {
                request = request.with_header(name, value);
            }
        } else if let Some((header_name, header_value)) =
            adapter.build_auth_header(self.api_key.as_deref())
        {
            request = request.with_header(header_name, header_value);
        }

        request
    }

    pub async fn build_with_channels(self, channels: u8) -> ListenClient<A> {
        let adapter = A::default();
        let params = self.get_params();
        let request = self.build_request(&adapter, channels).await;
        let initial_message = adapter.initial_message(self.api_key.as_deref(), &params, channels);

        ListenClient {
            adapter,
            request,
            initial_message,
        }
    }

    pub async fn build_single(self) -> ListenClient<A> {
        self.build_with_channels(1).await
    }

    pub async fn build_dual(self) -> ListenClientDual<A> {
        let adapter = A::default();
        let channels = if adapter.supports_native_multichannel() {
            2
        } else {
            1
        };
        let params = self.get_params();
        let request = self.build_request(&adapter, channels).await;
        let initial_message = adapter.initial_message(self.api_key.as_deref(), &params, channels);

        ListenClientDual {
            adapter,
            request,
            initial_message,
        }
    }
}

impl<A: RealtimeSttAdapter + BatchSttAdapter> ListenClientBuilder<A> {
    pub fn build_batch(self) -> BatchClient<A> {
        let params = self.get_params();
        let api_base = self.get_api_base().to_string();
        BatchClient::new(api_base, self.api_key.unwrap_or_default(), params)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hypr_language::ISO639;

    fn resolve_model_for_proxy(
        api_base: &str,
        model: &str,
        languages: &[hypr_language::Language],
    ) -> String {
        let mut params = owhisper_interface::ListenParams {
            model: Some(model.to_string()),
            languages: languages.to_vec(),
            ..Default::default()
        };

        if is_hyprnote_proxy(api_base) && params.model.as_deref().map_or(true, is_meta_model) {
            let adapter_kind =
                AdapterKind::from_url_and_languages(api_base, &params.languages, Some(model));
            if let Some(recommended) = adapter_kind.recommended_model_live(&params.languages) {
                params.model = Some(recommended.to_string());
            }
        }

        let adapter = DeepgramAdapter::default();
        let api_base = append_provider_param(api_base, adapter.provider_name());
        let url = adapter.build_ws_url(&api_base, &params, 1);
        url.to_string()
    }

    #[test]
    fn test_proxy_cloud_model_resolves_for_multi_language() {
        let url = resolve_model_for_proxy(
            "https://api.hyprnote.com/stt",
            "cloud",
            &[ISO639::En.into(), ISO639::De.into()],
        );
        assert!(
            url.contains("language=multi"),
            "proxy 'cloud' with en+de should use language=multi, got: {}",
            url
        );
        assert!(
            url.contains("model=nova-3"),
            "proxy 'cloud' should resolve to nova-3, got: {}",
            url
        );
    }

    #[test]
    fn test_proxy_cloud_model_single_language_unchanged() {
        let url = resolve_model_for_proxy(
            "https://api.hyprnote.com/stt",
            "cloud",
            &[ISO639::En.into()],
        );
        assert!(
            url.contains("language=en"),
            "single language should still work, got: {}",
            url
        );
    }

    #[test]
    fn test_direct_connection_model_not_overridden() {
        let url = resolve_model_for_proxy(
            "https://api.deepgram.com/v1",
            "nova-3",
            &[ISO639::En.into(), ISO639::De.into()],
        );
        assert!(
            url.contains("model=nova-3"),
            "direct connection model should be preserved, got: {}",
            url
        );
    }

    #[test]
    fn test_proxy_explicit_model_not_overridden() {
        let url = resolve_model_for_proxy(
            "https://api.hyprnote.com/stt",
            "nova-2",
            &[ISO639::En.into()],
        );
        assert!(
            url.contains("model=nova-2"),
            "explicit provider model on proxy should be preserved, got: {}",
            url
        );
    }
}
