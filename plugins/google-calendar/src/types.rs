use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, specta::Type)]
pub struct EventFilter {
    pub from: DateTime<Utc>,
    pub to: DateTime<Utc>,
    pub calendar_tracking_id: String,
}
