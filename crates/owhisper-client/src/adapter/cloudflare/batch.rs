use std::path::Path;

use base64::Engine;
use owhisper_interface::ListenParams;
use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word,
};
use serde::Deserialize;

use super::CloudflareAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter, ClientWithMiddleware};
use crate::error::Error;

use crate::providers::{Provider, is_meta_model};

// Cloudflare Workers AI REST API for speech recognition
// https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/
//
// Endpoint: https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}
// Auth: Authorization: Bearer {API_TOKEN}
// Input: JSON body with base64-encoded audio
// Output: JSON wrapped in Cloudflare API envelope { result: { text, segments, ... }, success, errors, messages }

impl BatchSttAdapter for CloudflareAdapter {
    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        CloudflareAdapter::is_supported_languages_batch(languages)
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
        Box::pin(
            async move { Self::do_transcribe_file(client, api_base, api_key, params, &path).await },
        )
    }
}

impl CloudflareAdapter {
    async fn do_transcribe_file(
        client: &ClientWithMiddleware,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_path: &Path,
    ) -> Result<BatchResponse, Error> {
        let file_bytes = tokio::fs::read(file_path).await.map_err(|e| {
            Error::AudioProcessing(format!(
                "failed to read file {}: {}",
                file_path.display(),
                e
            ))
        })?;

        let default = Provider::Cloudflare.default_batch_model();
        let model = match params.model.as_deref() {
            Some(m) if is_meta_model(m) => default,
            Some(m) => m,
            None => default,
        };

        // The Cloudflare Workers AI API base URL must include the account ID:
        // https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}
        let base = if api_base.is_empty() {
            return Err(Error::AudioProcessing(
                "Cloudflare Workers AI requires base URL with account ID (e.g. https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID})".to_string(),
            ));
        } else {
            api_base.trim_end_matches('/')
        };

        let url = format!("{}/ai/run/{}", base, model);

        let audio_base64 =
            base64::engine::general_purpose::STANDARD.encode(&file_bytes);

        let mut body = serde_json::json!({
            "audio": audio_base64,
        });

        if let Some(lang) = params.languages.first() {
            body["language"] = serde_json::Value::String(lang.iso639().code().to_string());
        }

        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .body(serde_json::to_vec(&body).map_err(|e| Error::AudioProcessing(e.to_string()))?)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(Error::UnexpectedStatus { status, body });
        }

        let cf_response: CloudflareApiResponse = response.json().await?;

        if !cf_response.success {
            let error_msg = cf_response
                .errors
                .into_iter()
                .map(|e| e.message)
                .collect::<Vec<_>>()
                .join("; ");
            return Err(Error::AudioProcessing(format!(
                "Cloudflare API error: {}",
                error_msg
            )));
        }

        let result = cf_response.result.ok_or_else(|| {
            Error::AudioProcessing("Cloudflare API returned success but no result".to_string())
        })?;

        Ok(convert_response(result))
    }
}

#[derive(Debug, Deserialize)]
struct CloudflareApiResponse {
    result: Option<CloudflareTranscriptionResult>,
    success: bool,
    #[serde(default)]
    errors: Vec<CloudflareApiError>,
}

#[derive(Debug, Deserialize)]
struct CloudflareApiError {
    message: String,
}

#[derive(Debug, Deserialize)]
struct CloudflareTranscriptionResult {
    text: String,
    #[serde(default)]
    segments: Vec<CloudflareSegment>,
}

#[derive(Debug, Deserialize)]
struct CloudflareSegment {
    #[serde(default)]
    #[allow(dead_code)]
    start: f64,
    #[serde(default)]
    #[allow(dead_code)]
    end: f64,
    #[serde(default)]
    #[allow(dead_code)]
    text: String,
    #[serde(default)]
    words: Vec<CloudflareWord>,
}

#[derive(Debug, Deserialize)]
struct CloudflareWord {
    word: String,
    start: f64,
    end: f64,
}

fn strip_punctuation(s: &str) -> String {
    s.trim_matches(|c: char| c.is_ascii_punctuation())
        .to_string()
}

fn convert_response(result: CloudflareTranscriptionResult) -> BatchResponse {
    // Extract words from segments
    let words: Vec<Word> = result
        .segments
        .into_iter()
        .flat_map(|segment| segment.words)
        .map(|w| {
            let normalized = strip_punctuation(&w.word);
            Word {
                word: if normalized.is_empty() {
                    w.word.clone()
                } else {
                    normalized
                },
                start: w.start,
                end: w.end,
                confidence: 1.0,
                speaker: None,
                punctuated_word: Some(w.word),
            }
        })
        .collect();

    let alternatives = BatchAlternatives {
        transcript: result.text.trim().to_string(),
        confidence: 1.0,
        words,
    };

    let channel = BatchChannel {
        alternatives: vec![alternatives],
    };

    BatchResponse {
        metadata: serde_json::json!({}),
        results: BatchResults {
            channels: vec![channel],
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_response_with_words() {
        let result = CloudflareTranscriptionResult {
            text: "Hello world".to_string(),
            segments: vec![CloudflareSegment {
                start: 0.0,
                end: 2.0,
                text: "Hello world".to_string(),
                words: vec![
                    CloudflareWord {
                        word: "Hello".to_string(),
                        start: 0.0,
                        end: 0.5,
                    },
                    CloudflareWord {
                        word: "world".to_string(),
                        start: 0.6,
                        end: 1.0,
                    },
                ],
            }],
        };

        let response = convert_response(result);
        assert!(!response.results.channels.is_empty());
        let alt = &response.results.channels[0].alternatives[0];
        assert_eq!(alt.transcript, "Hello world");
        assert_eq!(alt.words.len(), 2);
        assert_eq!(alt.words[0].word, "Hello");
        assert_eq!(alt.words[1].word, "world");
    }

    #[test]
    fn test_convert_response_empty_segments() {
        let result = CloudflareTranscriptionResult {
            text: "Hello world".to_string(),
            segments: vec![],
        };

        let response = convert_response(result);
        assert!(!response.results.channels.is_empty());
        let alt = &response.results.channels[0].alternatives[0];
        assert_eq!(alt.transcript, "Hello world");
        assert!(alt.words.is_empty());
    }

    #[tokio::test]
    #[ignore]
    async fn test_cloudflare_batch_transcription() {
        let api_key =
            std::env::var("CLOUDFLARE_API_TOKEN").expect("CLOUDFLARE_API_TOKEN not set");
        let account_id =
            std::env::var("CLOUDFLARE_ACCOUNT_ID").expect("CLOUDFLARE_ACCOUNT_ID not set");

        let client = crate::http_client::create_client();
        let adapter = CloudflareAdapter::default();
        let params = ListenParams::default();
        let api_base = format!(
            "https://api.cloudflare.com/client/v4/accounts/{}",
            account_id
        );

        let audio_path = std::path::PathBuf::from(hypr_data::english_1::AUDIO_PATH);

        let result = adapter
            .transcribe_file(&client, &api_base, &api_key, &params, &audio_path)
            .await
            .expect("transcription failed");

        assert!(!result.results.channels.is_empty());
        assert!(!result.results.channels[0].alternatives.is_empty());
        assert!(
            !result.results.channels[0].alternatives[0]
                .transcript
                .is_empty()
        );
    }
}
