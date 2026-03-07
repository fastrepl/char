use owhisper_interface::stream::StreamResponse;

use crate::{ConnectionStage, DegradedError};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum SessionLifecycleEvent {
    #[serde(rename = "inactive")]
    Inactive {
        session_id: String,
        error: Option<String>,
    },
    #[serde(rename = "started")]
    Started { session_id: String },
    #[serde(rename = "finalizing")]
    Finalizing { session_id: String },
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum SessionProgressEvent {
    #[serde(rename = "audio_initializing")]
    AudioInitializing { session_id: String },
    #[serde(rename = "audio_ready")]
    AudioReady {
        session_id: String,
        device: Option<String>,
    },
    #[serde(rename = "listener_connecting")]
    ListenerConnecting {
        session_id: String,
        attempt: usize,
        max_attempts: usize,
    },
    #[serde(rename = "listener_retrying")]
    ListenerRetrying {
        session_id: String,
        attempt: usize,
        max_attempts: usize,
    },
    #[serde(rename = "listener_connected")]
    ListenerConnected { session_id: String, adapter: String },
    #[serde(rename = "listener_degraded")]
    ListenerDegraded {
        session_id: String,
        error: DegradedError,
    },
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone, Copy)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[serde(rename_all = "snake_case")]
pub enum RecordingMode {
    UserEnabled,
    ForcedFallback,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum RecordingStatusEvent {
    #[serde(rename = "disabled")]
    Disabled { session_id: String },
    #[serde(rename = "enabled")]
    Enabled {
        session_id: String,
        mode: RecordingMode,
    },
    #[serde(rename = "failed")]
    Failed {
        session_id: String,
        mode: RecordingMode,
        error: String,
    },
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum SessionErrorEvent {
    #[serde(rename = "audio_error")]
    AudioError {
        session_id: String,
        error: String,
        device: Option<String>,
        is_fatal: bool,
    },
    #[serde(rename = "connection_error")]
    ConnectionError {
        session_id: String,
        error: String,
        stage: ConnectionStage,
        attempts: usize,
        max_attempts: usize,
        retryable: bool,
    },
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum SessionDataEvent {
    #[serde(rename = "audio_amplitude")]
    AudioAmplitude {
        session_id: String,
        mic: u16,
        speaker: u16,
    },
    #[serde(rename = "mic_muted")]
    MicMuted { session_id: String, value: bool },
    #[serde(rename = "stream_response")]
    StreamResponse {
        session_id: String,
        response: Box<StreamResponse>,
    },
}
