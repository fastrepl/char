use hypr_transcript::accumulator::{SpeakerHint, TranscriptWord};
use owhisper_interface::batch::Response as BatchResponse;

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
        #[serde(rename = "batchResponse")]
        BatchResponse {
            session_id: String,
            response: BatchResponse,
        },
        #[serde(rename = "batchProgress")]
        BatchTranscriptWords {
            session_id: String,
            words: Vec<TranscriptWord>,
            speaker_hints: Vec<SpeakerHint>,
            percentage: f64,
        },
        #[serde(rename = "batchFailed")]
        BatchFailed { session_id: String, error: String },
    }
}
