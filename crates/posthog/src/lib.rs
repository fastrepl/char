use std::collections::HashMap;

use posthog_core::event::InnerEvent;
use posthog_rs::Event;

mod error;
pub use error::Error;

#[derive(Clone)]
pub struct PosthogClient {
    client: reqwest::Client,
    api_key: String,
}

impl PosthogClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key: api_key.into(),
        }
    }

    pub async fn event(
        &self,
        distinct_id: &str,
        event_name: &str,
        props: &HashMap<String, serde_json::Value>,
    ) -> Result<(), Error> {
        let mut e = Event::new(event_name, distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        for (key, value) in props {
            let _ = e.insert_prop(key, value.clone());
        }

        let inner_event = InnerEvent::new(e, self.api_key.clone());

        self.client
            .post("https://us.i.posthog.com/i/v0/e/")
            .json(&inner_event)
            .send()
            .await?
            .error_for_status()?;

        Ok(())
    }

    pub async fn set_properties(
        &self,
        distinct_id: &str,
        set: &HashMap<String, serde_json::Value>,
        set_once: &HashMap<String, serde_json::Value>,
        email: Option<&str>,
    ) -> Result<(), Error> {
        let mut e = Event::new("$set", distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        if !set.is_empty() {
            let _ = e.insert_prop("$set", serde_json::json!(set));
        }

        if !set_once.is_empty() {
            let _ = e.insert_prop("$set_once", serde_json::json!(set_once));
        }

        if let Some(email) = email {
            let _ = e.insert_prop("$email", serde_json::json!(email));
        }

        let inner_event = InnerEvent::new(e, self.api_key.clone());

        self.client
            .post("https://us.i.posthog.com/i/v0/e/")
            .json(&inner_event)
            .send()
            .await?
            .error_for_status()?;

        Ok(())
    }

    pub async fn identify(
        &self,
        user_id: &str,
        anon_distinct_id: &str,
        set: &HashMap<String, serde_json::Value>,
        set_once: &HashMap<String, serde_json::Value>,
        email: Option<&str>,
    ) -> Result<(), Error> {
        let mut e = Event::new("$identify", user_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        let _ = e.insert_prop("$anon_distinct_id", anon_distinct_id);

        let mut set_props = set.clone();
        if let Some(email) = email {
            set_props.insert("email".to_string(), serde_json::json!(email));
        }
        if !set_props.is_empty() {
            let _ = e.insert_prop("$set", serde_json::json!(set_props));
        }

        if !set_once.is_empty() {
            let _ = e.insert_prop("$set_once", serde_json::json!(set_once));
        }

        let inner_event = InnerEvent::new(e, self.api_key.clone());

        self.client
            .post("https://us.i.posthog.com/i/v0/e/")
            .json(&inner_event)
            .send()
            .await?
            .error_for_status()?;

        Ok(())
    }
}
