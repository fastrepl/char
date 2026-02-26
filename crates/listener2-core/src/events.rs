use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::stream::StreamResponse;

#[derive(serde::Serialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
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
