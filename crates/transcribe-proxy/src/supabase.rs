use serde::{Deserialize, Serialize};

type BoxError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionJob {
    pub id: String,
    pub user_id: String,
    pub file_id: String,
    pub provider: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct SupabaseClient {
    pub client: reqwest::Client,
    pub url: String,
    pub service_role_key: String,
}

impl SupabaseClient {
    fn rest_url(&self) -> String {
        format!(
            "{}/rest/v1/transcription_jobs",
            self.url.trim_end_matches('/')
        )
    }

    fn auth_headers(&self, builder: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        builder
            .header("Authorization", format!("Bearer {}", self.service_role_key))
            .header("apikey", &self.service_role_key)
    }

    pub async fn insert_job(&self, job: &TranscriptionJob) -> Result<(), BoxError> {
        let response = self
            .auth_headers(self.client.post(self.rest_url()))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(job)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("failed to insert job: {status} {body}").into());
        }

        Ok(())
    }

    pub async fn update_job(&self, id: &str, updates: &serde_json::Value) -> Result<(), BoxError> {
        let url = format!("{}?id=eq.{}", self.rest_url(), id);

        let response = self
            .auth_headers(self.client.patch(&url))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(updates)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("failed to update job: {status} {body}").into());
        }

        Ok(())
    }

    pub async fn get_job(&self, id: &str) -> Result<Option<TranscriptionJob>, BoxError> {
        let url = format!("{}?id=eq.{}&select=*", self.rest_url(), id);

        let response = self
            .auth_headers(self.client.get(&url))
            .header("Accept", "application/json")
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("failed to get job: {status} {body}").into());
        }

        let jobs: Vec<TranscriptionJob> = response.json().await?;
        Ok(jobs.into_iter().next())
    }
}
