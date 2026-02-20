use std::collections::HashMap;

mod error;
mod outlit;

pub use error::*;

#[derive(Clone)]
pub struct DeviceFingerprint(pub String);

#[derive(Clone)]
pub struct AuthenticatedUserId(pub String);

use hypr_posthog::PosthogClient;
use outlit::OutlitClient;

#[derive(Clone)]
pub struct AnalyticsClient {
    posthog: Option<PosthogClient>,
    outlit: Option<OutlitClient>,
}

#[derive(Default)]
pub struct AnalyticsClientBuilder {
    posthog: Option<PosthogClient>,
    outlit: Option<OutlitClient>,
}

impl AnalyticsClientBuilder {
    pub fn with_posthog(mut self, key: impl Into<String>) -> Self {
        self.posthog = Some(PosthogClient::new(key));
        self
    }

    pub fn with_outlit(mut self, key: impl Into<String>) -> Self {
        self.outlit = OutlitClient::new(key);
        self
    }

    pub fn build(self) -> AnalyticsClient {
        AnalyticsClient {
            posthog: self.posthog,
            outlit: self.outlit,
        }
    }
}

impl AnalyticsClient {
    pub async fn event(
        &self,
        distinct_id: impl Into<String>,
        payload: AnalyticsPayload,
    ) -> Result<(), Error> {
        let distinct_id = distinct_id.into();

        if let Some(posthog) = &self.posthog {
            posthog
                .event(&distinct_id, &payload.event, &payload.props)
                .await?;
        } else {
            tracing::info!("event: {:?}", payload);
        }

        if let Some(outlit) = &self.outlit {
            outlit.event(&distinct_id, &payload).await;
        }

        Ok(())
    }

    pub async fn set_properties(
        &self,
        distinct_id: impl Into<String>,
        payload: PropertiesPayload,
    ) -> Result<(), Error> {
        let distinct_id = distinct_id.into();

        if let Some(posthog) = &self.posthog {
            posthog
                .set_properties(
                    &distinct_id,
                    &payload.set,
                    &payload.set_once,
                    payload.email.as_deref(),
                )
                .await?;
        } else {
            tracing::info!("set_properties: {:?}", payload);
        }

        if let Some(outlit) = &self.outlit {
            outlit.identify(&distinct_id, &payload).await;
        }

        Ok(())
    }

    pub async fn identify(
        &self,
        user_id: impl Into<String>,
        anon_distinct_id: impl Into<String>,
        payload: PropertiesPayload,
    ) -> Result<(), Error> {
        let user_id = user_id.into();
        let anon_distinct_id = anon_distinct_id.into();

        if let Some(posthog) = &self.posthog {
            posthog
                .identify(
                    &user_id,
                    &anon_distinct_id,
                    &payload.set,
                    &payload.set_once,
                    payload.email.as_deref(),
                )
                .await?;
        } else {
            tracing::info!(
                "identify: user_id={}, anon_distinct_id={}, payload={:?}",
                user_id,
                anon_distinct_id,
                payload
            );
        }

        if let Some(outlit) = &self.outlit {
            outlit.identify(&user_id, &payload).await;
        }

        Ok(())
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AnalyticsPayload {
    pub event: String,
    #[serde(flatten)]
    pub props: HashMap<String, serde_json::Value>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PropertiesPayload {
    #[serde(default)]
    pub set: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub set_once: HashMap<String, serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
}

#[derive(Clone)]
pub struct AnalyticsPayloadBuilder {
    event: Option<String>,
    props: HashMap<String, serde_json::Value>,
}

impl AnalyticsPayload {
    pub fn builder(event: impl Into<String>) -> AnalyticsPayloadBuilder {
        AnalyticsPayloadBuilder {
            event: Some(event.into()),
            props: HashMap::new(),
        }
    }
}

impl AnalyticsPayloadBuilder {
    pub fn with(mut self, key: impl Into<String>, value: impl Into<serde_json::Value>) -> Self {
        self.props.insert(key.into(), value.into());
        self
    }

    pub fn build(self) -> AnalyticsPayload {
        if self.event.is_none() {
            panic!("'Event' is not specified");
        }

        AnalyticsPayload {
            event: self.event.unwrap(),
            props: self.props,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_analytics() {
        let client = AnalyticsClientBuilder::default().build();
        let payload = AnalyticsPayload::builder("test_event")
            .with("key1", "value1")
            .with("key2", 2)
            .build();

        client.event("machine_id_123", payload).await.unwrap();
    }
}
