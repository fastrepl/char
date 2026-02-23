use hypr_listener2_core as core;
use hypr_transcript::TranscriptDelta;

#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
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
}

impl From<core::BatchEvent> for BatchEvent {
    fn from(event: core::BatchEvent) -> Self {
        match event {
            core::BatchEvent::BatchStarted { session_id } => {
                BatchEvent::BatchStarted { session_id }
            }
            core::BatchEvent::BatchProgress {
                session_id,
                delta,
                percentage,
            } => BatchEvent::BatchProgress {
                session_id,
                delta,
                percentage,
            },
            core::BatchEvent::BatchEnded { session_id } => BatchEvent::BatchEnded { session_id },
            core::BatchEvent::BatchFailed { session_id, error } => {
                BatchEvent::BatchFailed { session_id, error }
            }
        }
    }
}
