use std::path::Path;

use owhisper_interface::ListenParams;
use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word,
};
use serde::Deserialize;

use super::BedrockAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter, ClientWithMiddleware};
use crate::adapter::http::mime_type_from_extension;
use crate::error::Error;
use crate::providers::{Provider, is_meta_model};

// Amazon Bedrock supports OpenAI-compatible audio transcription via
// the bedrock-mantle endpoint: POST /v1/audio/transcriptions
// https://docs.aws.amazon.com/bedrock/latest/userguide/apis.html
impl BatchSttAdapter for BedrockAdapter {
    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        BedrockAdapter::language_support_batch(languages).is_supported()
    }

    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a ClientWithMiddleware,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        let path = file_path.as_ref().to_path_buf();
        Box::pin(async move {
            do_transcribe_file(client, api_base, api_key, params, &path).await
        })
    }
}

#[derive(Debug, Deserialize)]
struct BedrockWord {
    word: String,
    start: f64,
    end: f64,
}

#[derive(Debug, Deserialize)]
struct BedrockTranscriptionResponse {
    text: String,
    #[serde(default)]
    words: Option<Vec<BedrockWord>>,
    #[serde(default)]
    #[allow(dead_code)]
    language: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    duration: Option<f64>,
}

async fn do_transcribe_file(
    client: &ClientWithMiddleware,
    api_base: &str,
    api_key: &str,
    params: &ListenParams,
    file_path: &Path,
) -> Result<BatchResponse, Error> {
    let fallback_name = match file_path.extension().and_then(|e| e.to_str()) {
        Some(ext) => format!("audio.{}", ext),
        None => "audio".to_string(),
    };

    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .map(ToOwned::to_owned)
        .unwrap_or(fallback_name);

    let file_bytes = tokio::fs::read(file_path)
        .await
        .map_err(|e| Error::AudioProcessing(e.to_string()))?;

    let mime_type = mime_type_from_extension(file_path);

    let file_part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str(mime_type)
        .map_err(|e| Error::AudioProcessing(e.to_string()))?;

    let default = Provider::Bedrock.default_batch_model();
    let model = match params.model.as_deref() {
        Some(m) if is_meta_model(m) => default,
        Some(m) => m,
        None => default,
    };

    let mut form = reqwest::multipart::Form::new()
        .part("file", file_part)
        .text("model", model.to_string());

    form = form.text("response_format", "verbose_json");
    form = form.text("timestamp_granularities[]", "word");

    if let Some(lang) = params.languages.first() {
        form = form.text("language", lang.iso639().code().to_string());
    }

    let base = if api_base.is_empty() {
        Provider::Bedrock.default_api_base()
    } else {
        api_base.trim_end_matches('/')
    };
    let url = format!("{}/audio/transcriptions", base);

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(Error::UnexpectedStatus { status, body });
    }

    let bedrock_response: BedrockTranscriptionResponse = response.json().await?;

    let words: Vec<Word> = bedrock_response
        .words
        .unwrap_or_default()
        .into_iter()
        .map(|w| Word {
            word: w.word.clone(),
            start: w.start,
            end: w.end,
            confidence: 1.0,
            speaker: None,
            punctuated_word: Some(w.word),
        })
        .collect();

    let alternatives = BatchAlternatives {
        transcript: bedrock_response.text.trim().to_string(),
        confidence: 1.0,
        words,
    };

    let channel = BatchChannel {
        alternatives: vec![alternatives],
    };

    let metadata = serde_json::json!({
        "language": bedrock_response.language,
    });

    Ok(BatchResponse {
        metadata,
        results: BatchResults {
            channels: vec![channel],
        },
    })
}
