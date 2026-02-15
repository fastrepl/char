pub use soniox::CallbackPayload as SonioxCallback;
pub use soniox::Error as SonioxError;
pub use soniox::fetch_transcript_raw;

pub async fn transcribe_with_callback(
    client: &reqwest::Client,
    audio_url: &str,
    callback_url: &str,
    api_key: &str,
    options: Option<&serde_json::Value>,
) -> Result<String, SonioxError> {
    let mut body = serde_json::json!({
        "model": "stt-async-v4",
        "audio_url": audio_url,
        "webhook_url": callback_url,
        "enable_speaker_diarization": true,
        "enable_language_identification": true,
    });

    if let Some(overrides) = options {
        if let (Some(base), Some(extra)) = (body.as_object_mut(), overrides.as_object()) {
            for (k, v) in extra {
                base.insert(k.clone(), v.clone());
            }
        }
    }

    soniox::create_transcription(client, &body, api_key).await
}
