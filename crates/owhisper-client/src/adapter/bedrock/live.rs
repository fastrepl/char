use hypr_ws_client::client::Message;
use owhisper_interface::ListenParams;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse};
use serde::{Deserialize, Serialize};

use super::BedrockAdapter;
use crate::adapter::RealtimeSttAdapter;
use crate::adapter::parsing::{WordBuilder, calculate_time_span};

// Amazon Bedrock via bedrock-mantle exposes an OpenAI-compatible Realtime API.
// This adapter follows the same protocol as the OpenAI adapter.
impl RealtimeSttAdapter for BedrockAdapter {
    fn provider_name(&self) -> &'static str {
        "bedrock"
    }

    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        BedrockAdapter::is_supported_languages_live(languages)
    }

    fn supports_native_multichannel(&self) -> bool {
        false
    }

    fn build_ws_url(&self, api_base: &str, _params: &ListenParams, _channels: u8) -> url::Url {
        let (mut url, existing_params) = Self::build_ws_url_from_base(api_base);

        if !existing_params.is_empty() {
            let mut query_pairs = url.query_pairs_mut();
            for (key, value) in &existing_params {
                query_pairs.append_pair(key, value);
            }
        }

        url
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        api_key.and_then(|k| crate::providers::Provider::Bedrock.build_auth_header(k))
    }

    fn keep_alive_message(&self) -> Option<Message> {
        None
    }

    fn audio_to_message(&self, audio: bytes::Bytes) -> Message {
        use base64::Engine;
        let base64_audio = base64::engine::general_purpose::STANDARD.encode(&audio);
        let event = InputAudioBufferAppend {
            event_type: "input_audio_buffer.append".to_string(),
            audio: base64_audio,
        };
        Message::Text(serde_json::to_string(&event).unwrap().into())
    }

    fn initial_message(
        &self,
        _api_key: Option<&str>,
        params: &ListenParams,
        _channels: u8,
    ) -> Option<Message> {
        let language = params
            .languages
            .first()
            .map(|l| l.iso639().code().to_string());

        let default = crate::providers::Provider::Bedrock.default_live_model();
        let model = match params.model.as_deref() {
            Some(m) if crate::providers::is_meta_model(m) => default,
            Some(m) => m,
            None => default,
        };

        let session_config = SessionUpdateEvent {
            event_type: "session.update".to_string(),
            session: SessionConfig {
                session_type: "transcription".to_string(),
                audio: Some(AudioConfig {
                    input: Some(AudioInputConfig {
                        format: Some(AudioFormat {
                            format_type: "audio/pcm".to_string(),
                            rate: params.sample_rate,
                        }),
                        transcription: Some(TranscriptionConfig {
                            model: model.to_string(),
                            language,
                        }),
                        turn_detection: Some(TurnDetection {
                            detection_type: "server_vad".to_string(),
                            threshold: Some(0.5),
                            prefix_padding_ms: Some(300),
                            silence_duration_ms: Some(500),
                        }),
                    }),
                }),
                include: Some(vec!["item.input_audio_transcription.logprobs".to_string()]),
            },
        };

        let json = serde_json::to_string(&session_config).ok()?;
        tracing::debug!(payload = %json, "bedrock_session_update_payload");
        Some(Message::Text(json.into()))
    }

    fn finalize_message(&self) -> Message {
        let commit = InputAudioBufferCommit {
            event_type: "input_audio_buffer.commit".to_string(),
        };
        Message::Text(serde_json::to_string(&commit).unwrap().into())
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        let event: BedrockEvent = match serde_json::from_str(raw) {
            Ok(e) => e,
            Err(e) => {
                tracing::warn!(error = ?e, raw = raw, "bedrock_json_parse_failed");
                return vec![];
            }
        };

        match event {
            BedrockEvent::SessionCreated { session } => {
                tracing::debug!(session_id = %session.id, "bedrock_session_created");
                vec![]
            }
            BedrockEvent::SessionUpdated { session } => {
                tracing::debug!(session_id = %session.id, "bedrock_session_updated");
                vec![]
            }
            BedrockEvent::InputAudioBufferCommitted { item_id } => {
                tracing::debug!(item_id = %item_id, "bedrock_audio_buffer_committed");
                vec![]
            }
            BedrockEvent::InputAudioBufferCleared => {
                tracing::debug!("bedrock_audio_buffer_cleared");
                vec![]
            }
            BedrockEvent::InputAudioBufferSpeechStarted { item_id } => {
                tracing::debug!(item_id = %item_id, "bedrock_speech_started");
                vec![]
            }
            BedrockEvent::InputAudioBufferSpeechStopped { item_id } => {
                tracing::debug!(item_id = %item_id, "bedrock_speech_stopped");
                vec![]
            }
            BedrockEvent::ConversationItemInputAudioTranscriptionCompleted {
                item_id,
                content_index,
                transcript,
            } => {
                tracing::debug!(
                    item_id = %item_id,
                    content_index = content_index,
                    transcript = %transcript,
                    "bedrock_transcription_completed"
                );
                Self::build_transcript_response(&transcript, true, true)
            }
            BedrockEvent::ConversationItemInputAudioTranscriptionDelta {
                item_id,
                content_index,
                delta,
            } => {
                tracing::debug!(
                    item_id = %item_id,
                    content_index = content_index,
                    delta = %delta,
                    "bedrock_transcription_delta"
                );
                Self::build_transcript_response(&delta, false, false)
            }
            BedrockEvent::ConversationItemInputAudioTranscriptionFailed {
                item_id, error, ..
            } => {
                tracing::error!(
                    item_id = %item_id,
                    error_type = %error.error_type,
                    error_message = %error.message,
                    "bedrock_transcription_failed"
                );
                vec![StreamResponse::ErrorResponse {
                    error_code: None,
                    error_message: format!("{}: {}", error.error_type, error.message),
                    provider: "bedrock".to_string(),
                }]
            }
            BedrockEvent::Error { error } => {
                tracing::error!(
                    error_type = %error.error_type,
                    error_message = %error.message,
                    "bedrock_error"
                );
                vec![StreamResponse::ErrorResponse {
                    error_code: None,
                    error_message: format!("{}: {}", error.error_type, error.message),
                    provider: "bedrock".to_string(),
                }]
            }
            BedrockEvent::Unknown => {
                tracing::debug!(raw = raw, "bedrock_unknown_event");
                vec![]
            }
        }
    }
}

#[derive(Debug, Serialize)]
struct SessionUpdateEvent {
    #[serde(rename = "type")]
    event_type: String,
    session: SessionConfig,
}

#[derive(Debug, Serialize)]
struct SessionConfig {
    #[serde(rename = "type")]
    session_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    audio: Option<AudioConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    include: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct AudioConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    input: Option<AudioInputConfig>,
}

#[derive(Debug, Serialize)]
struct AudioInputConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<AudioFormat>,
    #[serde(skip_serializing_if = "Option::is_none")]
    transcription: Option<TranscriptionConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    turn_detection: Option<TurnDetection>,
}

#[derive(Debug, Serialize)]
struct AudioFormat {
    #[serde(rename = "type")]
    format_type: String,
    rate: u32,
}

#[derive(Debug, Serialize)]
struct TranscriptionConfig {
    model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
}

#[derive(Debug, Serialize)]
struct TurnDetection {
    #[serde(rename = "type")]
    detection_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    threshold: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    prefix_padding_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    silence_duration_ms: Option<u32>,
}

#[derive(Debug, Serialize)]
struct InputAudioBufferAppend {
    #[serde(rename = "type")]
    event_type: String,
    audio: String,
}

#[derive(Debug, Serialize)]
struct InputAudioBufferCommit {
    #[serde(rename = "type")]
    event_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
#[allow(dead_code)]
enum BedrockEvent {
    #[serde(rename = "session.created")]
    SessionCreated { session: SessionInfo },
    #[serde(rename = "session.updated")]
    SessionUpdated { session: SessionInfo },
    #[serde(rename = "input_audio_buffer.committed")]
    InputAudioBufferCommitted { item_id: String },
    #[serde(rename = "input_audio_buffer.cleared")]
    InputAudioBufferCleared,
    #[serde(rename = "input_audio_buffer.speech_started")]
    InputAudioBufferSpeechStarted { item_id: String },
    #[serde(rename = "input_audio_buffer.speech_stopped")]
    InputAudioBufferSpeechStopped { item_id: String },
    #[serde(rename = "conversation.item.input_audio_transcription.completed")]
    ConversationItemInputAudioTranscriptionCompleted {
        item_id: String,
        content_index: u32,
        transcript: String,
    },
    #[serde(rename = "conversation.item.input_audio_transcription.delta")]
    ConversationItemInputAudioTranscriptionDelta {
        item_id: String,
        content_index: u32,
        delta: String,
    },
    #[serde(rename = "conversation.item.input_audio_transcription.failed")]
    ConversationItemInputAudioTranscriptionFailed {
        item_id: String,
        content_index: u32,
        error: BedrockError,
    },
    #[serde(rename = "error")]
    Error { error: BedrockError },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
struct SessionInfo {
    id: String,
}

#[derive(Debug, Deserialize)]
struct BedrockError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

impl BedrockAdapter {
    fn build_transcript_response(
        transcript: &str,
        is_final: bool,
        speech_final: bool,
    ) -> Vec<StreamResponse> {
        if transcript.is_empty() {
            return vec![];
        }

        let words: Vec<_> = transcript
            .split_whitespace()
            .map(|word| WordBuilder::new(word).confidence(1.0).build())
            .collect();

        let (start, duration) = calculate_time_span(&words);

        let channel = Channel {
            alternatives: vec![Alternatives {
                transcript: transcript.to_string(),
                words,
                confidence: 1.0,
                languages: vec![],
            }],
        };

        vec![StreamResponse::TranscriptResponse {
            is_final,
            speech_final,
            from_finalize: false,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: vec![0, 1],
        }]
    }
}
