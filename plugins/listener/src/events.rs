use owhisper_interface::stream::StreamResponse;

use hypr_listener_core as core;

#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(
            serde::Serialize, serde::Deserialize, Clone, specta::Type, tauri_specta::Event,
        )]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionLifecycleEvent {
        #[serde(rename = "inactive")]
        Inactive {
            session_id: String,
            error: Option<String>,
        },
        #[serde(rename = "active")]
        Active {
            session_id: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            error: Option<crate::DegradedError>,
        },
        #[serde(rename = "finalizing")]
        Finalizing { session_id: String },
    }
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionProgressEvent {
        #[serde(rename = "audio_initializing")]
        AudioInitializing { session_id: String },
        #[serde(rename = "audio_ready")]
        AudioReady {
            session_id: String,
            device: Option<String>,
        },
        #[serde(rename = "connecting")]
        Connecting { session_id: String },
        #[serde(rename = "connected")]
        Connected {
            session_id: String,
            adapter: String,
        },
    }
}

common_event_derives! {
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
        },
    }
}

common_event_derives! {
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
}

impl From<core::SessionLifecycleEvent> for SessionLifecycleEvent {
    fn from(event: core::SessionLifecycleEvent) -> Self {
        match event {
            core::SessionLifecycleEvent::Inactive { session_id, error } => {
                SessionLifecycleEvent::Inactive { session_id, error }
            }
            core::SessionLifecycleEvent::Active { session_id, error } => {
                SessionLifecycleEvent::Active { session_id, error }
            }
            core::SessionLifecycleEvent::Finalizing { session_id } => {
                SessionLifecycleEvent::Finalizing { session_id }
            }
        }
    }
}

impl From<core::SessionProgressEvent> for SessionProgressEvent {
    fn from(event: core::SessionProgressEvent) -> Self {
        match event {
            core::SessionProgressEvent::AudioInitializing { session_id } => {
                SessionProgressEvent::AudioInitializing { session_id }
            }
            core::SessionProgressEvent::AudioReady { session_id, device } => {
                SessionProgressEvent::AudioReady { session_id, device }
            }
            core::SessionProgressEvent::Connecting { session_id } => {
                SessionProgressEvent::Connecting { session_id }
            }
            core::SessionProgressEvent::Connected {
                session_id,
                adapter,
            } => SessionProgressEvent::Connected {
                session_id,
                adapter,
            },
        }
    }
}

impl From<core::SessionErrorEvent> for SessionErrorEvent {
    fn from(event: core::SessionErrorEvent) -> Self {
        match event {
            core::SessionErrorEvent::AudioError {
                session_id,
                error,
                device,
                is_fatal,
            } => SessionErrorEvent::AudioError {
                session_id,
                error,
                device,
                is_fatal,
            },
            core::SessionErrorEvent::ConnectionError { session_id, error } => {
                SessionErrorEvent::ConnectionError { session_id, error }
            }
        }
    }
}

impl From<core::SessionDataEvent> for SessionDataEvent {
    fn from(event: core::SessionDataEvent) -> Self {
        match event {
            core::SessionDataEvent::AudioAmplitude {
                session_id,
                mic,
                speaker,
            } => SessionDataEvent::AudioAmplitude {
                session_id,
                mic,
                speaker,
            },
            core::SessionDataEvent::MicMuted { session_id, value } => {
                SessionDataEvent::MicMuted { session_id, value }
            }
            core::SessionDataEvent::StreamResponse {
                session_id,
                response,
            } => SessionDataEvent::StreamResponse {
                session_id,
                response,
            },
        }
    }
}
