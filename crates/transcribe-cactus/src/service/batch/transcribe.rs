use std::io::Write;
use std::path::Path;

use owhisper_interface::ListenParams;
use owhisper_interface::batch;
use owhisper_interface::stream::{Extra, Metadata, ModelInfo};

use super::audio::{audio_duration_secs, content_type_to_extension};
use super::response::build_batch_words;

pub(super) fn transcribe_batch(
    audio_data: &[u8],
    content_type: &str,
    params: &ListenParams,
    model_path: &Path,
) -> Result<batch::Response, crate::Error> {
    let extension = content_type_to_extension(content_type);
    let mut temp_file = tempfile::Builder::new()
        .prefix("cactus_batch_")
        .suffix(&format!(".{}", extension))
        .tempfile()?;

    temp_file.write_all(audio_data)?;
    temp_file.flush()?;

    let model = hypr_cactus::Model::new(model_path)?;

    let options = hypr_cactus::TranscribeOptions {
        language: hypr_cactus::constrain_to(&params.languages),
        ..Default::default()
    };

    let total_duration = audio_duration_secs(temp_file.path());

    let cactus_response = model.transcribe_file(temp_file.path(), &options)?;
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

#[cfg(test)]
mod tests {
    use std::path::Path;

    use hypr_language::ISO639;
    use owhisper_interface::ListenParams;

    use super::*;

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

        let params = ListenParams {
            languages: vec![ISO639::En.into()],
            ..Default::default()
        };

        let response = transcribe_batch(&wav_bytes, "audio/wav", &params, model_path)
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
