use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum NotificationEvent {
    Confirm,
    Accept,
    Dismiss,
    Timeout,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NotificationKey {
    MicStarted { apps: BTreeSet<String> },
    MicStopped { apps: BTreeSet<String> },
    CalendarEvent { event_id: String },
    Custom(String),
}

impl NotificationKey {
    pub fn mic_started(app_bundle_ids: impl IntoIterator<Item = String>) -> Self {
        Self::MicStarted {
            apps: app_bundle_ids.into_iter().collect(),
        }
    }

    pub fn mic_stopped(app_bundle_ids: impl IntoIterator<Item = String>) -> Self {
        Self::MicStopped {
            apps: app_bundle_ids.into_iter().collect(),
        }
    }

    pub fn calendar_event(event_id: impl Into<String>) -> Self {
        Self::CalendarEvent {
            event_id: event_id.into(),
        }
    }

    pub fn to_dedup_key(&self) -> String {
        match self {
            Self::MicStarted { apps } => {
                let sorted: Vec<_> = apps.iter().cloned().collect();
                format!("mic-started:{}", sorted.join(","))
            }
            Self::MicStopped { apps } => {
                let sorted: Vec<_> = apps.iter().cloned().collect();
                format!("mic-stopped:{}", sorted.join(","))
            }
            Self::CalendarEvent { event_id } => {
                format!("event:{event_id}")
            }
            Self::Custom(s) => s.clone(),
        }
    }
}

impl From<String> for NotificationKey {
    fn from(s: String) -> Self {
        Self::Custom(s)
    }
}

impl From<&str> for NotificationKey {
    fn from(s: &str) -> Self {
        Self::Custom(s.to_string())
    }
}

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize, specta::Type,
)]
pub enum ParticipantStatus {
    #[default]
    Accepted,
    Maybe,
    Declined,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Participant {
    pub name: Option<String>,
    pub email: String,
    pub status: ParticipantStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct EventDetails {
    pub what: String,
    pub timezone: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NotificationContext {
    pub key: String,
    pub event_id: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Notification {
    pub key: Option<String>,
    pub title: String,
    pub message: String,
    pub timeout: Option<std::time::Duration>,
    pub event_id: Option<String>,
    pub source: Option<String>,
    pub start_time: Option<i64>,
    pub participants: Option<Vec<Participant>>,
    pub event_details: Option<EventDetails>,
    pub action_label: Option<String>,
}

impl Notification {
    pub fn builder() -> NotificationBuilder {
        NotificationBuilder::default()
    }

    pub fn is_persistent(&self) -> bool {
        self.timeout.is_none()
    }
}

#[derive(Default)]
pub struct NotificationBuilder {
    key: Option<String>,
    title: Option<String>,
    message: Option<String>,
    timeout: Option<std::time::Duration>,
    event_id: Option<String>,
    source: Option<String>,
    start_time: Option<i64>,
    participants: Option<Vec<Participant>>,
    event_details: Option<EventDetails>,
    action_label: Option<String>,
}

impl NotificationBuilder {
    pub fn key(mut self, key: impl Into<String>) -> Self {
        self.key = Some(key.into());
        self
    }

    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    pub fn message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }

    pub fn timeout(mut self, timeout: std::time::Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn event_id(mut self, event_id: impl Into<String>) -> Self {
        self.event_id = Some(event_id.into());
        self
    }

    pub fn source(mut self, source: impl Into<String>) -> Self {
        self.source = Some(source.into());
        self
    }

    pub fn start_time(mut self, start_time: i64) -> Self {
        self.start_time = Some(start_time);
        self
    }

    pub fn participants(mut self, participants: Vec<Participant>) -> Self {
        self.participants = Some(participants);
        self
    }

    pub fn event_details(mut self, event_details: EventDetails) -> Self {
        self.event_details = Some(event_details);
        self
    }

    pub fn action_label(mut self, action_label: impl Into<String>) -> Self {
        self.action_label = Some(action_label.into());
        self
    }

    pub fn build(self) -> Notification {
        Notification {
            key: self.key,
            title: self.title.unwrap(),
            message: self.message.unwrap(),
            timeout: self.timeout,
            event_id: self.event_id,
            source: self.source,
            start_time: self.start_time,
            participants: self.participants,
            event_details: self.event_details,
            action_label: self.action_label,
        }
    }
}
