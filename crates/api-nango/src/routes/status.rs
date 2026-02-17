use axum::{Extension, Json, extract::State};
use hypr_api_auth::AuthContext;
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct ConnectionItem {
    pub integration_id: String,
    pub connection_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListConnectionsResponse {
    pub connections: Vec<ConnectionItem>,
}

#[utoipa::path(
    get,
    path = "/connections",
    responses(
        (status = 200, description = "List of active connections", body = ListConnectionsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "nango",
)]
pub async fn list_connections(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<ListConnectionsResponse>> {
    let user_id = &auth.claims.sub;
    let encoded_user_id = urlencoding::encode(user_id);
    let url = format!(
        "{}/rest/v1/nango_connections?select=integration_id,connection_id,updated_at&user_id=eq.{}",
        state.config.supabase_url.trim_end_matches('/'),
        encoded_user_id,
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

    let connections = rows
        .into_iter()
        .map(|row| ConnectionItem {
            integration_id: row.integration_id,
            connection_id: row.connection_id,
            updated_at: row.updated_at,
        })
        .collect();

    Ok(Json(ListConnectionsResponse { connections }))
}
