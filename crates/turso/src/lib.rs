mod error;
pub use error::*;

use cached::{Cached, SizedCache};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct TursoClient {
    client: reqwest::Client,
    pub api_base: url::Url,
    pub api_key: String,
    pub org_slug: String,
    token_cache: Option<Arc<Mutex<SizedCache<String, String>>>>,
}

#[derive(Default)]
pub struct CreateDatabaseRequestBuilder {
    pub name: Option<String>,
    pub is_schema: Option<bool>,
    pub schema: Option<String>,
    token_cache: Option<Arc<Mutex<SizedCache<String, String>>>>,
}

#[derive(Debug, Serialize)]
pub struct CreateDatabaseRequest {
    pub name: String,
    pub group: String,
    pub is_schema: Option<bool>,
    pub schema: Option<String>,
}

impl CreateDatabaseRequestBuilder {
    pub fn build(self) -> CreateDatabaseRequest {
        // `_` is invalid
        CreateDatabaseRequest {
            name: self.name.unwrap(),
            group: "hyprnote".to_string(),
            is_schema: self.is_schema,
            schema: self.schema,
        }
    }

    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    pub fn with_schema(mut self, schema: impl Into<String>) -> Self {
        self.is_schema = Some(true);
        self.schema = Some(schema.into());
        self
    }

    pub fn with_token_cache(mut self) -> Self {
        let default_cache = Arc::new(Mutex::new(SizedCache::with_size(128)));
        self.token_cache = Some(default_cache);
        self
    }
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
// There can be other fields along with 'database' field, which we are not interested in.
pub enum DatabaseResponse<T> {
    #[serde(rename = "error")]
    Error { error: String },
    #[serde(rename = "database")]
    Ok { database: T },
}

#[derive(Debug, Deserialize)]
pub struct CreateDatabaseResponse {
    #[serde(rename = "DbId")]
    pub db_id: String,
    #[serde(rename = "Hostname")]
    pub host_name: String,
    #[serde(rename = "Name")]
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct RetrieveDatabaseResponse {
    #[serde(rename = "DbId")]
    pub db_id: String,
    #[serde(rename = "Hostname")]
    pub host_name: String,
    #[serde(rename = "Name")]
    pub name: String,
    pub block_reads: bool,
    pub block_writes: bool,
    pub allow_attach: bool,
    pub regions: Vec<String>,
    #[serde(rename = "primaryRegion")]
    pub primary_region: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub version: String,
    pub group: String,
    pub is_schema: bool,
    pub schema: Option<String>,
    pub archived: bool,
}

#[derive(Debug, Deserialize)]
pub struct DeleteDatabaseResponse {
    pub database: String,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum GenerateTokenResponse {
    Error { error: String },
    Token { jwt: String },
}

#[derive(Default)]
pub struct TursoClientBuilder {
    api_key: Option<String>,
    org_slug: Option<String>,
    token_cache: Option<Arc<Mutex<SizedCache<String, String>>>>,
}

impl TursoClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn org_slug(mut self, org_slug: impl Into<String>) -> Self {
        self.org_slug = Some(org_slug.into());
        self
    }

    pub fn with_token_cache(mut self, size: usize) -> Self {
        self.token_cache = Some(Arc::new(Mutex::new(SizedCache::with_size(size))));
        self
    }

    pub fn build(self) -> TursoClient {
        let mut headers = reqwest::header::HeaderMap::new();

        let api_key = self.api_key.unwrap();
        let auth_str = format!("Bearer {}", &api_key);
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        TursoClient {
            client,
            api_base: "https://api.turso.tech".parse().unwrap(),
            api_key,
            org_slug: self.org_slug.unwrap(),
            token_cache: self.token_cache,
        }
    }
}

// https://docs.turso.tech/api-reference
impl TursoClient {
    pub fn builder() -> TursoClientBuilder {
        TursoClientBuilder::default()
    }

    pub fn format_db_url(&self, name: impl Into<String>) -> String {
        format_db_url(name, &self.org_slug)
    }

    pub fn format_db_name(&self, name: impl Into<String>) -> String {
        format_db_name(name)
    }

    // https://docs.turso.tech/api-reference/databases/create-token
    pub async fn generate_db_token(&self, db_name: impl Into<String>) -> Result<String, Error> {
        let db_name = db_name.into();

        if let Some(cache) = &self.token_cache {
            let mut guard = cache.lock().unwrap();
            if let Some(token) = guard.cache_get(&db_name) {
                return Ok(token.to_owned());
            }
        }

        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/v1/organizations/{}/databases/{}/auth/tokens",
            self.org_slug, db_name
        ));
        url.query_pairs_mut()
            .append_pair("expiration", "never")
            .append_pair("authorization", "full-access");

        let res = self
            .client
            .post(url)
            .send()
            .await?
            .json::<GenerateTokenResponse>()
            .await?;

        match res {
            GenerateTokenResponse::Error { error } => Err(Error::GenerateTokenError(error)),
            GenerateTokenResponse::Token { jwt } => {
                if let Some(cache) = &self.token_cache {
                    let mut guard = cache.lock().unwrap();
                    guard.cache_set(db_name, jwt.clone());
                }
                Ok(jwt)
            }
        }
    }

    // https://docs.turso.tech/api-reference/databases/create
    pub async fn create_database(
        &self,
        req: CreateDatabaseRequest,
    ) -> Result<CreateDatabaseResponse, crate::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/v1/organizations/{}/databases", self.org_slug));

        let res: DatabaseResponse<CreateDatabaseResponse> = self
            .client
            .post(url)
            .json(&req)
            .send()
            .await?
            .json()
            .await?;

        match res {
            DatabaseResponse::Error { error } => Err(crate::Error::CreateDatabaseError(error)),
            DatabaseResponse::Ok { database } => Ok(database),
        }
    }

    // https://docs.turso.tech/api-reference/databases/retrieve
    pub async fn retrieve_database(
        &self,
        db: impl std::fmt::Display,
    ) -> Result<RetrieveDatabaseResponse, crate::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/v1/organizations/{}/databases/{}",
            self.org_slug, db
        ));

        let res: DatabaseResponse<RetrieveDatabaseResponse> =
            self.client.get(url).send().await?.json().await?;

        match res {
            DatabaseResponse::Error { error } => Err(crate::Error::RetrieveDatabaseError(error)),
            DatabaseResponse::Ok { database } => Ok(database),
        }
    }

    // https://docs.turso.tech/api-reference/databases/delete
    pub async fn delete_database(
        &self,
        db: impl std::fmt::Display,
    ) -> Result<DeleteDatabaseResponse, crate::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/v1/organizations/{}/databases/{}",
            self.org_slug, db
        ));

        let res: DatabaseResponse<DeleteDatabaseResponse> =
            self.client.delete(url).send().await?.json().await?;

        match res {
            DatabaseResponse::Error { error } => Err(crate::Error::DeleteDatabaseError(error)),
            DatabaseResponse::Ok { database } => Ok(database),
        }
    }
}

pub const DEFAULT_ORG_SLUG: &str = "yujonglee";

pub fn format_db_url(name: impl Into<String>, org_slug: impl Into<String>) -> String {
    format!("libsql://{}-{}.turso.io", name.into(), org_slug.into())
}

pub fn format_db_name(name: impl Into<String>) -> String {
    if cfg!(debug_assertions) {
        format!("dev-{}", name.into())
    } else {
        format!("prod-{}", name.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_client() -> TursoClient {
        TursoClient::builder()
            .api_key(std::env::var("TURSO_API_KEY").unwrap())
            .org_slug("yujonglee")
            .with_token_cache(128)
            .build()
    }

    // cargo test test_generate_db_token -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_generate_db_token() {
        let client = get_client();

        let jwt = client.generate_db_token("prod-admin").await.unwrap();
        println!("jwt: {:?}", jwt);
    }

    // cargo test test_create_database -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_create_database() {
        let client = get_client();

        let req = CreateDatabaseRequestBuilder::default()
            .with_name("test")
            .build();
        let res = client.create_database(req).await;
        assert!(res.is_ok());
    }

    // cargo test test_retrieve_database -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_retrieve_database() {
        let client = get_client();

        let res = client.retrieve_database("test").await;
        assert!(res.is_ok());
    }
}
