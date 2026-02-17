use std::marker::PhantomData;

use axum::{
    Json,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use hypr_api_auth::AuthContext;
use hypr_nango::{NangoClient, OwnedNangoHttpClient, OwnedNangoProxy};
use serde::Serialize;

use crate::integrations::NangoIntegrationId;

#[derive(Clone)]
pub struct NangoConnectionState {
    nango: NangoClient,
    http_client: reqwest::Client,
    supabase_url: String,
    supabase_anon_key: String,
}

impl NangoConnectionState {
    pub fn new(
        nango: NangoClient,
        supabase_url: impl Into<String>,
        supabase_anon_key: impl Into<String>,
    ) -> Self {
        Self {
            nango,
            http_client: reqwest::Client::new(),
            supabase_url: supabase_url.into().trim_end_matches('/').to_string(),
            supabase_anon_key: supabase_anon_key.into(),
        }
    }

    pub fn from_config(config: &crate::config::NangoConfig) -> Self {
        let mut builder = hypr_nango::NangoClient::builder().api_key(&config.nango.nango_api_key);
        if let Some(api_base) = &config.nango.nango_api_base {
            builder = builder.api_base(api_base);
        }
        let nango = builder.build().expect("failed to build NangoClient");

        Self::new(nango, &config.supabase_url, &config.supabase_anon_key)
    }

    async fn get_connection_id(
        &self,
        auth_token: &str,
        user_id: &str,
        integration_id: &str,
    ) -> Result<String, NangoConnectionError> {
        let encoded_user_id = urlencoding::encode(user_id);
        let encoded_integration_id = urlencoding::encode(integration_id);
        let url = format!(
            "{}/rest/v1/nango_connections?select=connection_id&user_id=eq.{}&integration_id=eq.{}",
            self.supabase_url, encoded_user_id, encoded_integration_id,
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("apikey", &self.supabase_anon_key)
            .send()
            .await
            .map_err(|e| NangoConnectionError::Database(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(NangoConnectionError::Database(format!(
                "query failed: {} - {}",
                status, body
            )));
        }

        #[derive(serde::Deserialize)]
        struct Row {
            connection_id: String,
        }

        let rows: Vec<Row> = response
            .json()
            .await
            .map_err(|e| NangoConnectionError::Database(e.to_string()))?;

        rows.into_iter()
            .next()
            .map(|r| r.connection_id)
            .ok_or_else(|| NangoConnectionError::NotConnected(integration_id.to_string()))
    }
}

pub struct NangoConnection<I: NangoIntegrationId> {
    http: OwnedNangoHttpClient,
    _marker: PhantomData<I>,
}

impl<I: NangoIntegrationId> NangoConnection<I> {
    pub fn into_http(self) -> OwnedNangoHttpClient {
        self.http
    }
}

#[derive(Debug)]
pub enum NangoConnectionError {
    NotAuthenticated,
    NotConnected(String),
    MissingState,
    Database(String),
}

#[derive(Serialize)]
struct ErrorDetails {
    code: String,
    message: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetails,
}

impl IntoResponse for NangoConnectionError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            Self::NotAuthenticated => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "not authenticated".to_string(),
            ),
            Self::NotConnected(integration_id) => (
                StatusCode::BAD_REQUEST,
                "not_connected",
                format!("no connection found for integration: {}", integration_id),
            ),
            Self::MissingState => {
                tracing::error!("NangoConnectionState not found in request extensions");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_server_error",
                    "internal server error".to_string(),
                )
            }
            Self::Database(msg) => {
                tracing::error!(error = %msg, "nango_connection_db_error");
                sentry::capture_message(msg, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_server_error",
                    "internal server error".to_string(),
                )
            }
        };

        let body = Json(ErrorResponse {
            error: ErrorDetails {
                code: code.to_string(),
                message,
            },
        });

        (status, body).into_response()
    }
}

impl std::fmt::Display for NangoConnectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotAuthenticated => write!(f, "not authenticated"),
            Self::NotConnected(id) => write!(f, "not connected: {}", id),
            Self::MissingState => write!(f, "missing NangoConnectionState"),
            Self::Database(msg) => write!(f, "database error: {}", msg),
        }
    }
}

impl std::error::Error for NangoConnectionError {}

impl<S: Send + Sync, I: NangoIntegrationId> FromRequestParts<S> for NangoConnection<I> {
    type Rejection = NangoConnectionError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth = parts
            .extensions
            .get::<AuthContext>()
            .ok_or(NangoConnectionError::NotAuthenticated)?;

        let nango_state = parts
            .extensions
            .get::<NangoConnectionState>()
            .ok_or(NangoConnectionError::MissingState)?;

        let connection_id = nango_state
            .get_connection_id(&auth.token, &auth.claims.sub, I::ID)
            .await?;

        let proxy = OwnedNangoProxy::new(&nango_state.nango, I::ID.to_string(), connection_id);
        let http = OwnedNangoHttpClient::new(proxy);

        Ok(NangoConnection {
            http,
            _marker: PhantomData,
        })
    }
}
