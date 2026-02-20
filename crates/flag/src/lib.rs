mod cached;
mod error;
mod types;

pub use cached::CachedClient;
pub use error::Error;
pub use types::*;

#[derive(Clone)]
pub struct FlagClient {
    client: reqwest::Client,
    api_key: String,
}

impl FlagClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key: api_key.into(),
        }
    }

    pub async fn get_flags(
        &self,
        distinct_id: &str,
        options: Option<FlagOptions>,
    ) -> Result<FlagsResponse, Error> {
        let options = options.unwrap_or_default();

        let mut body = serde_json::json!({
            "api_key": self.api_key,
            "distinct_id": distinct_id,
        });

        if let Some(groups) = &options.groups {
            body["groups"] = serde_json::json!(groups);
        }

        if let Some(person_properties) = &options.person_properties {
            body["person_properties"] = serde_json::json!(person_properties);
        }

        if let Some(group_properties) = &options.group_properties {
            body["group_properties"] = serde_json::json!(group_properties);
        }

        let response = self
            .client
            .post("https://us.i.posthog.com/flags?v=2")
            .json(&body)
            .send()
            .await?
            .error_for_status()?;

        let raw: RawFlagsResponse = response.json().await?;

        if raw.errors_while_computing_flags {
            return Err(Error::ComputeError);
        }

        Ok(FlagsResponse::new(raw))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_get_flags() {
        let client = FlagClient::new("test_api_key");
        let result = client.get_flags("test_user", None).await;
        println!("{:?}", result);
    }
}
