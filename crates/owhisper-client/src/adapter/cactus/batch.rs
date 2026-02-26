use std::path::Path;

use futures_util::StreamExt;
use owhisper_interface::{InferencePhase, InferenceProgress, ListenParams, batch, stream};
use tokio_stream::wrappers::UnboundedReceiverStream;

use super::CactusAdapter;
use crate::adapter::deepgram_compat::listen_endpoint_url;
use crate::adapter::{StreamingBatchEvent, StreamingBatchStream, is_local_host};
use serde_json::Value;
use crate::error::Error;

impl CactusAdapter {
    pub async fn transcribe_file_streaming<P: AsRef<Path>>(
        api_base: &str,
        _api_key: &str,
        params: &ListenParams,
        file_path: P,
    ) -> Result<StreamingBatchStream, Error> {
        let path = file_path.as_ref().to_path_buf();

        let (audio_bytes, content_type) = tokio::task::spawn_blocking(move || {
            let bytes = std::fs::read(&path).map_err(|e| Error::AudioProcessing(e.to_string()))?;
            let ct = crate::adapter::http::mime_type_from_extension(&path).to_string();
            Ok::<_, Error>((bytes::Bytes::from(bytes), ct))
        })
        .await??;

        let url = build_http_url(api_base, params);

        let response = reqwest::Client::new()
            .post(url)
            .header("Content-Type", content_type)
            .header("Accept", "text/event-stream")
            .body(audio_bytes)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(Error::UnexpectedStatus { status, body });
        }

        let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<Result<StreamingBatchEvent, Error>>();

        tokio::spawn(async move {
            let mut byte_stream = response.bytes_stream();
            let mut buf = String::new();
            let mut current_event = String::new();
            let mut current_data = String::new();
            let mut accumulated = String::new();

            loop {
                match byte_stream.next().await {
                    None => break,
                    Some(Err(e)) => {
                        let _ = tx.send(Err(Error::AudioProcessing(e.to_string())));
                        break;
                    }
                    Some(Ok(chunk)) => {
                        buf.push_str(&String::from_utf8_lossy(&chunk));

                        while let Some(pos) = buf.find('\n') {
                            let line = buf[..pos].trim_end_matches('\r').to_string();
                            buf = buf[pos + 1..].to_string();

                            if let Some(ev) = line.strip_prefix("event:") {
                                current_event = ev.trim().to_string();
                            } else if let Some(data) = line.strip_prefix("data:") {
                                current_data = data.trim().to_string();
                            } else if line.is_empty() && !current_event.is_empty() {
                                let event_type = std::mem::take(&mut current_event);
                                let data = std::mem::take(&mut current_data);

                                match event_type.as_str() {
                                    "progress" => {
                                        let progress = parse_progress(&data);
                                        if let Some(fragment) = progress.partial_text {
                                            accumulated.push_str(&fragment);
                                        }
                                        let event = in_progress_event(&accumulated, progress.percentage);
                                        let _ = tx.send(Ok(event));
                                    }
                                    "result" => {
                                        match serde_json::from_str::<batch::Response>(&data) {
                                            Ok(r) => {
                                                let _ = tx.send(Ok(batch_to_event(r)));
                                            }
                                            Err(e) => {
                                                let _ = tx.send(Err(Error::AudioProcessing(
                                                    format!("result parse error: {e}"),
                                                )));
                                            }
                                        }
                                    }
                                    "error" => {
                                        let _ = tx.send(Err(Error::AudioProcessing(data)));
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                }
            }
        });

        Ok(Box::pin(UnboundedReceiverStream::new(rx)))
    }
}

fn build_http_url(api_base: &str, params: &ListenParams) -> url::Url {
    let (mut url, existing_params) = listen_endpoint_url(api_base);

    let host = url.host_str().unwrap_or("localhost").to_string();
    let _ = url.set_scheme(if is_local_host(&host) {
        "http"
    } else {
        "https"
    });

    {
        let mut q = url.query_pairs_mut();
        for (k, v) in &existing_params {
            q.append_pair(k, v);
        }
        q.append_pair("channels", &params.channels.max(1).to_string());
        q.append_pair("sample_rate", &params.sample_rate.to_string());
        if let Some(lang) = params.languages.first() {
            q.append_pair("language", lang.iso639_code());
        }
        for kw in &params.keywords {
            q.append_pair("keywords", kw);
        }
    }

    url
}

fn parse_progress(data: &str) -> InferenceProgress {
    if let Ok(p) = serde_json::from_str::<InferenceProgress>(data) {
        return p;
    }

    // Backward-compat / best-effort parsing
    if let Ok(v) = serde_json::from_str::<Value>(data) {
        let percentage = v["percentage"].as_f64().unwrap_or(0.0);
        let partial_text = v["partial_text"]
            .as_str()
            .or_else(|| v["token"].as_str())
            .map(|s| s.to_string());
        return InferenceProgress {
            percentage,
            partial_text,
            phase: InferencePhase::Transcribing,
        };
    }

    InferenceProgress {
        percentage: 0.0,
        partial_text: Some(data.to_string()),
        phase: InferencePhase::Transcribing,
    }
}

fn in_progress_event(accumulated: &str, percentage: f64) -> StreamingBatchEvent {
    StreamingBatchEvent {
        response: stream::StreamResponse::TranscriptResponse {
            start: 0.0,
            duration: 0.0,
            is_final: false,
            speech_final: false,
            from_finalize: false,
            channel: stream::Channel {
                alternatives: vec![stream::Alternatives {
                    transcript: accumulated.to_string(),
                    words: vec![],
                    confidence: 0.0,
                    languages: vec![],
                }],
            },
            metadata: stream::Metadata::default(),
            channel_index: vec![0, 1],
        },
        percentage,
    }
}

fn batch_to_event(response: batch::Response) -> StreamingBatchEvent {
    let duration = response
        .metadata
        .get("duration")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let (transcript, words, confidence) = response
        .results
        .channels
        .into_iter()
        .next()
        .and_then(|c| c.alternatives.into_iter().next())
        .map(|a| {
            let words = a
                .words
                .iter()
                .map(|w| stream::Word {
                    word: w.word.clone(),
                    start: w.start,
                    end: w.end,
                    confidence: w.confidence,
                    speaker: w.speaker.map(|s| s as i32),
                    punctuated_word: w.punctuated_word.clone(),
                    language: None,
                })
                .collect::<Vec<_>>();
            (a.transcript, words, a.confidence)
        })
        .unwrap_or_default();

    StreamingBatchEvent {
        response: stream::StreamResponse::TranscriptResponse {
            start: 0.0,
            duration,
            is_final: true,
            speech_final: true,
            from_finalize: true,
            channel: stream::Channel {
                alternatives: vec![stream::Alternatives {
                    transcript,
                    words,
                    confidence,
                    languages: vec![],
                }],
            },
            metadata: stream::Metadata::default(),
            channel_index: vec![0, 1],
        },
        percentage: 1.0,
    }
}
