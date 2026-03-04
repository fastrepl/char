use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::stream::StreamResponse;

#[derive(serde::Serialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum BatchEvent {
    #[serde(rename = "batchStarted")]
    BatchStarted { session_id: String },
    #[serde(rename = "batchResponse")]
    BatchResponse {
        session_id: String,
        response: BatchResponse,
    },
    #[serde(rename = "batchProgress")]
    BatchResponseStreamed {
        session_id: String,
        response: StreamResponse,
        percentage: f64,
    },
    #[serde(rename = "batchFailed")]
    BatchFailed { session_id: String, error: String },
}

#[derive(serde::Serialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[cfg_attr(feature = "tauri-event", derive(tauri_specta::Event))]
#[serde(tag = "type")]
pub enum DenoiseEvent {
    #[serde(rename = "denoiseStarted")]
    DenoiseStarted { session_id: String },
    #[serde(rename = "denoiseProgress")]
    DenoiseProgress { session_id: String, percentage: f64 },
    #[serde(rename = "denoiseCompleted")]
    DenoiseCompleted { session_id: String },
    #[serde(rename = "denoiseFailed")]
    DenoiseFailed { session_id: String, error: String },
}
