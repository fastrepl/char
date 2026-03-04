use std::path::Path;

use owhisper_interface::ListenParams;

use crate::adapter::{BatchFuture, BatchSttAdapter, ClientWithMiddleware};
use crate::error::Error;

use super::DashScopeAdapter;

impl BatchSttAdapter for DashScopeAdapter {
    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        DashScopeAdapter::is_supported_languages_batch(languages)
    }

    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        _client: &'a ClientWithMiddleware,
        _api_base: &'a str,
        _api_key: &'a str,
        _params: &'a ListenParams,
        _file_path: P,
    ) -> BatchFuture<'a> {
        Box::pin(async move {
            Err(Error::AudioProcessing(
                "DashScope batch transcription is not yet implemented".to_string(),
            ))
        })
    }
}
