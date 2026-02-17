use axum::{Extension, Json, extract::State};
use hypr_api_auth::AuthContext;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, Deserialize, IntoParams)]
pub struct ConnectionStatusQuery {
    pub integration_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ConnectionStatusResponse {
    pub connected: bool,
    pub integration_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[utoipa::path(
    get,
    path = "/connection-status",
    params(ConnectionStatusQuery),
    responses(
        (status = 200, description = "Connection status", body = ConnectionStatusResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "nango",
)]
pub async fn connection_status(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthContext>,
    axum::extract::Query(query): axum::extract::Query<ConnectionStatusQuery>,
) -> Result<Json<ConnectionStatusResponse>> {
    let user_id = &auth.claims.sub;
    let integration_id = &query.integration_id;

    let encoded_user_id = urlencoding::encode(user_id);
    let encoded_integration_id = urlencoding::encode(integration_id);
    let url = format!(
        "{}/rest/v1/nango_connections?select=connection_id,updated_at&user_id=eq.{}&integration_id=eq.{}",
        state.config.supabase_url.trim_end_matches('/'),
        encoded_user_id,
        encoded_integration_id,
    );

    let response = state
        .supabase
        .anon_query(&url, &auth.token)
        .await
        .map_err(|e| crate::error::NangoError::Internal(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(crate::error::NangoError::Internal(format!(
            "query failed: {} - {}",
            status, body
        )));
    }

    let rows: Vec<crate::supabase::NangoConnectionRow> = response
        .json()
        .await
        .map_err(|e| crate::error::NangoError::Internal(e.to_string()))?;

    match rows.into_iter().next() {
        Some(row) => Ok(Json(ConnectionStatusResponse {
            connected: true,
            integration_id: integration_id.to_string(),
            updated_at: row.updated_at,
        })),
        None => Ok(Json(ConnectionStatusResponse {
            connected: false,
            integration_id: integration_id.to_string(),
            updated_at: None,
        })),
    }
}
