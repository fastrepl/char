use std::io::Write;
use std::path::Path;

use hypr_audio_utils::Source;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use bytes::Bytes;
use owhisper_interface::ListenParams;
use owhisper_interface::batch;
use owhisper_interface::stream::{Extra, Metadata, ModelInfo};

pub async fn handle_batch(
    body: Bytes,
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Response {
    let model_path = model_path.to_path_buf();
    let content_type = content_type.to_string();
    let params = params.clone();

    let result = tokio::task::spawn_blocking(move || {
        transcribe_batch(&body, &content_type, &params, &model_path)
    })
    .await;

    match result {
        Ok(Ok(response)) => Json(response).into_response(),
        Ok(Err(e)) => {
            tracing::error!(error = %e, "batch_transcription_failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "transcription_failed",
                    "detail": e
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "batch_task_panicked");
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

fn transcribe_batch(
    audio_data: &[u8],
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Result<batch::Response, String> {
    let extension = content_type_to_extension(content_type);
    let mut temp_file = tempfile::Builder::new()
        .prefix("cactus_batch_")
        .suffix(&format!(".{}", extension))
        .tempfile()
        .map_err(|e| format!("failed to create temp file: {}", e))?;

    temp_file
        .write_all(audio_data)
        .map_err(|e| format!("failed to write audio data: {}", e))?;
    temp_file
        .flush()
        .map_err(|e| format!("failed to flush temp file: {}", e))?;

    let model =
        hypr_cactus::Model::new(model_path).map_err(|e| format!("failed to load model: {}", e))?;

    let options = hypr_cactus::TranscribeOptions {
        language: hypr_cactus::constrain_to(&params.languages),
        ..Default::default()
    };

    let total_duration = audio_duration_secs(temp_file.path());

    let cactus_response = model
        .transcribe_file(temp_file.path(), &options)
        .map_err(|e| format!("transcription failed: {}", e))?;
    let transcript = cactus_response.text.trim().to_string();
    let confidence = cactus_response.confidence as f64;
    let words = build_batch_words(&transcript, total_duration, confidence);

    let model_name = model_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cactus");

    let meta = Metadata {
        model_info: ModelInfo {
            name: model_name.to_string(),
            version: "1.0".to_string(),
            arch: "cactus".to_string(),
        },
        extra: Some(Extra::default().into()),
        ..Default::default()
    };

    let mut metadata = serde_json::to_value(&meta).unwrap_or_default();
    if let Some(obj) = metadata.as_object_mut() {
        obj.insert("duration".to_string(), serde_json::json!(total_duration));
        obj.insert("channels".to_string(), serde_json::json!(1));
    }

    Ok(batch::Response {
        metadata,
        results: batch::Results {
            channels: vec![batch::Channel {
                alternatives: vec![batch::Alternatives {
                    transcript,
                    confidence,
                    words,
                }],
            }],
        },
    })
}

fn build_batch_words(transcript: &str, total_duration: f64, confidence: f64) -> Vec<batch::Word> {
    let word_strs: Vec<&str> = transcript.split_whitespace().collect();
    if word_strs.is_empty() || total_duration <= 0.0 {
        return vec![];
    }

    let word_duration = total_duration / word_strs.len() as f64;
    word_strs
        .iter()
        .enumerate()
        .map(|(i, w)| batch::Word {
            word: w.to_string(),
            start: i as f64 * word_duration,
            end: (i + 1) as f64 * word_duration,
            confidence,
            speaker: None,
            punctuated_word: Some(w.to_string()),
        })
        .collect()
}

fn audio_duration_secs(path: &Path) -> f64 {
    let Ok(source) = hypr_audio_utils::source_from_path(path) else {
        return 0.0;
    };
    if let Some(d) = source.total_duration() {
        return d.as_secs_f64();
    }
    let sample_rate = source.sample_rate() as f64;
    let channels = source.channels().max(1) as f64;
    let count = source.count() as f64;
    count / channels / sample_rate
}

fn content_type_to_extension(content_type: &str) -> &'static str {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or(content_type)
        .trim();
    match mime {
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav",
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/ogg" => "ogg",
        "audio/flac" => "flac",
        "audio/mp4" | "audio/m4a" | "audio/x-m4a" => "m4a",
        "audio/webm" => "webm",
        "audio/aac" => "aac",
        _ => "wav",
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    #[test]
    fn content_type_mapping() {
        assert_eq!(content_type_to_extension("audio/wav"), "wav");
        assert_eq!(content_type_to_extension("audio/wave"), "wav");
        assert_eq!(content_type_to_extension("audio/mpeg"), "mp3");
        assert_eq!(content_type_to_extension("audio/mp3"), "mp3");
        assert_eq!(content_type_to_extension("audio/ogg"), "ogg");
        assert_eq!(content_type_to_extension("audio/flac"), "flac");
        assert_eq!(content_type_to_extension("audio/m4a"), "m4a");
        assert_eq!(content_type_to_extension("audio/webm"), "webm");
        assert_eq!(content_type_to_extension("audio/aac"), "aac");
        assert_eq!(content_type_to_extension("application/octet-stream"), "wav");
    }

    #[test]
    fn content_type_with_charset() {
        assert_eq!(content_type_to_extension("audio/wav; charset=utf-8"), "wav");
        assert_eq!(content_type_to_extension("audio/mpeg; bitrate=128"), "mp3");
    }

    #[test]
    fn batch_words_evenly_distributed() {
        let words = build_batch_words("hello beautiful world", 3.0, 0.9);
        assert_eq!(words.len(), 3);

        assert_eq!(words[0].word, "hello");
        assert!((words[0].start - 0.0).abs() < f64::EPSILON);
        assert!((words[0].end - 1.0).abs() < f64::EPSILON);
        assert_eq!(words[0].punctuated_word, Some("hello".to_string()));

        assert_eq!(words[1].word, "beautiful");
        assert!((words[1].start - 1.0).abs() < f64::EPSILON);
        assert!((words[1].end - 2.0).abs() < f64::EPSILON);

        assert_eq!(words[2].word, "world");
        assert!((words[2].start - 2.0).abs() < f64::EPSILON);
        assert!((words[2].end - 3.0).abs() < f64::EPSILON);

        for w in &words {
            assert!((w.confidence - 0.9).abs() < f64::EPSILON);
            assert_eq!(w.speaker, None);
        }
    }

    #[test]
    fn batch_words_empty_transcript() {
        let words = build_batch_words("", 5.0, 0.9);
        assert!(words.is_empty());
    }

    #[test]
    fn batch_words_zero_duration() {
        let words = build_batch_words("hello world", 0.0, 0.9);
        assert!(words.is_empty());
    }

    #[test]
    fn batch_response_deepgram_shape() {
        let words = build_batch_words("hello world", 2.0, 0.95);
        let meta = Metadata {
            model_info: ModelInfo {
                name: "test".to_string(),
                version: "1.0".to_string(),
                arch: "cactus".to_string(),
            },
            extra: Some(Extra::default().into()),
            ..Default::default()
        };

        let mut metadata = serde_json::to_value(&meta).unwrap();
        if let Some(obj) = metadata.as_object_mut() {
            obj.insert("duration".to_string(), serde_json::json!(2.0));
            obj.insert("channels".to_string(), serde_json::json!(1));
        }

        let response = batch::Response {
            metadata: metadata.clone(),
            results: batch::Results {
                channels: vec![batch::Channel {
                    alternatives: vec![batch::Alternatives {
                        transcript: "hello world".to_string(),
                        confidence: 0.95,
                        words,
                    }],
                }],
            },
        };

        let json = serde_json::to_string(&response).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert!(v["metadata"]["request_id"].as_str().is_some());
        assert_eq!(v["metadata"]["duration"], 2.0);
        assert_eq!(v["metadata"]["channels"], 1);
        assert_eq!(v["results"]["channels"].as_array().unwrap().len(), 1);
        assert_eq!(
            v["results"]["channels"][0]["alternatives"][0]["transcript"],
            "hello world"
        );
        assert_eq!(
            v["results"]["channels"][0]["alternatives"][0]["words"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
    }

    #[ignore = "requires local cactus model files"]
    #[test]
    fn e2e_transcribe_with_real_model_inference() {
        let model_path =
            std::env::var("CACTUS_STT_MODEL").unwrap_or_else(|_| "/tmp/cactus-model".to_string());
        let model_path = Path::new(&model_path);
        assert!(
            model_path.exists(),
            "model path does not exist: {}",
            model_path.display()
        );

        let wav_bytes = std::fs::read(hypr_data::english_1::AUDIO_PATH)
            .unwrap_or_else(|e| panic!("failed to read fixture wav: {e}"));

        let response = transcribe_batch(
            &wav_bytes,
            "audio/wav",
            &ListenParams::default(),
            model_path,
        )
        .unwrap_or_else(|e| panic!("real-model batch transcription failed: {e}"));

        let Some(channel) = response.results.channels.first() else {
            panic!("expected at least one channel in response");
        };
        let Some(alternative) = channel.alternatives.first() else {
            panic!("expected at least one alternative in response");
        };

        println!("\n--- BATCH TRANSCRIPT ---");
        println!("{}", alternative.transcript.trim());
        println!("--- END (confidence={:.2}) ---\n", alternative.confidence);

        let transcript = alternative.transcript.trim().to_lowercase();
        assert!(!transcript.is_empty(), "expected non-empty transcript");
        assert!(
            transcript.contains("maybe")
                || transcript.contains("this")
                || transcript.contains("talking"),
            "transcript looks like a hallucination (got: {:?})",
            transcript
        );
        assert!(
            alternative.confidence.is_finite(),
            "expected finite confidence"
        );
        assert!(
            response
                .metadata
                .get("duration")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or_default()
                > 0.0,
            "expected positive duration metadata"
        );
    }
}
