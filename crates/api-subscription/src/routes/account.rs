use axum::{
    Extension, Json,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use hypr_api_auth::AuthContext;
use serde::Serialize;
use utoipa::ToSchema;

use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAccountResponse {
    pub deleted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[utoipa::path(
    delete,
    path = "/delete-account",
    responses(
        (status = 200, description = "Account deleted successfully", body = DeleteAccountResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
)]
pub async fn delete_account(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthContext>,
) -> Response {
    let user_id = &auth.claims.sub;

    match state.supabase.admin_delete_user(user_id).await {
        Ok(()) => {
            tracing::info!(user_id = %user_id, "account_deleted");
            (
                StatusCode::OK,
                Json(DeleteAccountResponse {
                    deleted: true,
                    error: None,
                }),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!(user_id = %user_id, error = %e, "account_deletion_failed");
            sentry::capture_message(&e.to_string(), sentry::Level::Error);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(DeleteAccountResponse {
                    deleted: false,
                    error: Some("account_deletion_failed".to_string()),
                }),
            )
                .into_response()
        }
    }
}
