use axum::{Extension, Json, extract::State};
use hypr_api_auth::AuthContext;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateConnectSessionRequest {
    #[serde(default)]
    pub allowed_integrations: Option<Vec<String>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ConnectSessionResponse {
    pub token: String,
    pub expires_at: String,
}

#[utoipa::path(
    post,
    path = "/connect-session",
    request_body(content = CreateConnectSessionRequest, content_type = "application/json"),
    responses(
        (status = 200, description = "Connect session created", body = ConnectSessionResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "nango",
)]
pub async fn create_connect_session(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthContext>,
    Json(body): Json<CreateConnectSessionRequest>,
) -> Result<Json<ConnectSessionResponse>> {
    let user_id = auth.claims.sub;
    let email = auth.claims.email;

    let mut tags = std::collections::HashMap::new();
    tags.insert("end_user_id".to_string(), user_id.clone());
    if let Some(ref e) = email {
        tags.insert("end_user_email".to_string(), e.clone());
    }

    let req = hypr_nango::CreateConnectSessionRequest {
        end_user: hypr_nango::EndUser {
            id: user_id,
            display_name: None,
            email,
            tags: Some(tags),
        },
        organization: None,
        allowed_integrations: body.allowed_integrations,
        integrations_config_defaults: None,
    };

    let session = state.nango.create_connect_session(req).await?;

    Ok(Json(ConnectSessionResponse {
        token: session.token,
        expires_at: session.expires_at,
    }))
}
