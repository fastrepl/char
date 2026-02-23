#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum NotificationEvent {
        #[serde(rename = "notification_confirm")]
        Confirm { key: String, event_id: Option<String>, source: Option<String> },
        #[serde(rename = "notification_accept")]
        Accept { key: String, event_id: Option<String>, source: Option<String> },
        #[serde(rename = "notification_dismiss")]
        Dismiss { key: String, event_id: Option<String>, source: Option<String> },
        #[serde(rename = "notification_timeout")]
        Timeout { key: String, event_id: Option<String>, source: Option<String> },
    }
}
