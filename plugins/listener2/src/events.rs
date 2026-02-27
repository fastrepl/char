use hypr_listener2_core as core;

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
            response: owhisper_interface::batch::Response,
        },
        #[serde(rename = "batchProgress")]
        BatchResponseStreamed {
            session_id: String,
            response: owhisper_interface::stream::StreamResponse,
            percentage: f64,
        },
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
            core::BatchEvent::BatchResponse {
                session_id,
                response,
            } => BatchEvent::BatchResponse {
                session_id,
                response,
            },
            core::BatchEvent::BatchResponseStreamed {
                session_id,
                response,
                percentage,
            } => BatchEvent::BatchResponseStreamed {
                session_id,
                response,
                percentage,
            },
            core::BatchEvent::BatchFailed { session_id, error } => {
                BatchEvent::BatchFailed { session_id, error }
            }
        }
    }
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum DenoiseEvent {
        #[serde(rename = "denoiseStarted")]
        DenoiseStarted { session_id: String },
        #[serde(rename = "denoiseProgress")]
        DenoiseProgress {
            session_id: String,
            percentage: f64,
        },
        #[serde(rename = "denoiseCompleted")]
        DenoiseCompleted { session_id: String },
        #[serde(rename = "denoiseFailed")]
        DenoiseFailed { session_id: String, error: String },
    }
}

impl From<core::DenoiseEvent> for DenoiseEvent {
    fn from(event: core::DenoiseEvent) -> Self {
        match event {
            core::DenoiseEvent::DenoiseStarted { session_id } => {
                DenoiseEvent::DenoiseStarted { session_id }
            }
            core::DenoiseEvent::DenoiseProgress {
                session_id,
                percentage,
            } => DenoiseEvent::DenoiseProgress {
                session_id,
                percentage,
            },
            core::DenoiseEvent::DenoiseCompleted { session_id } => {
                DenoiseEvent::DenoiseCompleted { session_id }
            }
            core::DenoiseEvent::DenoiseFailed { session_id, error } => {
                DenoiseEvent::DenoiseFailed { session_id, error }
            }
        }
    }
}
