use axum::{Extension, Json, extract::State};
use hypr_api_auth::AuthContext;
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct ConnectSessionResponse {
    pub token: String,
    pub expires_at: String,
}

#[utoipa::path(
    post,
    path = "/connect-session",
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
) -> Result<Json<ConnectSessionResponse>> {
    let user_id = auth.claims.sub;

    let req = hypr_nango::CreateConnectSessionRequest {
        end_user: hypr_nango::EndUser {
            id: user_id,
            display_name: None,
            email: None,
            tags: None,
        },
        organization: None,
        allowed_integrations: None,
        integrations_config_defaults: None,
    };

    let session = state.nango.create_connect_session(req).await?;

    Ok(Json(ConnectSessionResponse {
        token: session.token,
        expires_at: session.expires_at,
    }))
}
