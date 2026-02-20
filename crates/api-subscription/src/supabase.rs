use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{Result, SubscriptionError};

fn url_encode(s: &str) -> String {
    urlencoding::encode(s).into_owned()
}

#[derive(Clone)]
pub struct SupabaseClient {
    base_url: String,
    anon_key: String,
    http_client: Client,
}

impl SupabaseClient {
    pub fn new(supabase_url: impl Into<String>, anon_key: impl Into<String>) -> Self {
        Self {
            base_url: supabase_url.into().trim_end_matches('/').to_string(),
            anon_key: anon_key.into(),
            http_client: Client::new(),
        }
    }

    pub async fn rpc<T: for<'de> Deserialize<'de>>(
        &self,
        function_name: &str,
        auth_token: &str,
        body: Option<Value>,
    ) -> Result<T> {
        let url = format!("{}/rest/v1/rpc/{}", self.base_url, function_name);

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .json(&body.unwrap_or(Value::Object(Default::default())))
            .send()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown".to_string());
            return Err(SubscriptionError::SupabaseRequest(format!(
                "RPC {} failed: {} - {}",
                function_name, status, body
            )));
        }

        response
            .json()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))
    }

    pub async fn select<T: for<'de> Deserialize<'de>>(
        &self,
        table: &str,
        auth_token: &str,
        select: &str,
        filters: &[(&str, &str)],
    ) -> Result<Vec<T>> {
        let mut url = format!(
            "{}/rest/v1/{}?select={}",
            self.base_url,
            url_encode(table),
            url_encode(select)
        );
        for (key, value) in filters {
            url.push_str(&format!("&{}={}", url_encode(key), url_encode(value)));
        }

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("apikey", &self.anon_key)
            .send()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown".to_string());
            return Err(SubscriptionError::SupabaseRequest(format!(
                "SELECT from {} failed: {} - {}",
                table, status, body
            )));
        }

        response
            .json()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))
    }

    pub async fn update<T: Serialize>(
        &self,
        table: &str,
        auth_token: &str,
        filters: &[(&str, &str)],
        data: &T,
    ) -> Result<()> {
        let mut url = format!("{}/rest/v1/{}", self.base_url, url_encode(table));
        if !filters.is_empty() {
            url.push('?');
            for (i, (key, value)) in filters.iter().enumerate() {
                if i > 0 {
                    url.push('&');
                }
                url.push_str(&format!("{}={}", url_encode(key), url_encode(value)));
            }
        }

        let response = self
            .http_client
            .patch(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .json(data)
            .send()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown".to_string());
            return Err(SubscriptionError::SupabaseRequest(format!(
                "UPDATE {} failed: {} - {}",
                table, status, body
            )));
        }

        Ok(())
    }

    pub async fn get_user_email(&self, auth_token: &str) -> Result<Option<String>> {
        let url = format!("{}/auth/v1/user", self.base_url);

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("apikey", &self.anon_key)
            .send()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown".to_string());
            return Err(SubscriptionError::SupabaseRequest(format!(
                "GET user failed: {} - {}",
                status, body
            )));
        }

        #[derive(Deserialize)]
        struct UserResponse {
            email: Option<String>,
        }

        let user: UserResponse = response
            .json()
            .await
            .map_err(|e| SubscriptionError::SupabaseRequest(e.to_string()))?;

        Ok(user.email)
    }
}
