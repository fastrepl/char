use hypr_transcript::TranscriptDelta;

#[derive(serde::Serialize, Clone)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[serde(tag = "type")]
pub enum BatchEvent {
    #[serde(rename = "batchStarted")]
    BatchStarted { session_id: String },
    #[serde(rename = "batchProgress")]
    BatchProgress {
        session_id: String,
        delta: TranscriptDelta,
        percentage: f64,
    },
    #[serde(rename = "batchEnded")]
    BatchEnded { session_id: String },
    #[serde(rename = "batchFailed")]
    BatchFailed { session_id: String, error: String },
}
