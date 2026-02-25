use axum::{
    Extension, Json,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use hypr_api_auth::AuthContext;
use serde::Serialize;
use stripe_core::customer::DeleteCustomer;
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

    // 1. Delete Stripe customer (also cancels active subscriptions).
    //    The webhook sync engine will update the `stripe` schema accordingly.
    match state.supabase.admin_get_stripe_customer_id(user_id).await {
        Ok(Some(customer_id)) => {
            match DeleteCustomer::new(&*customer_id).send(&state.stripe).await {
                Ok(_) => {
                    tracing::info!(user_id = %user_id, customer_id = %customer_id, "stripe_customer_deleted");
                }
                Err(e) => {
                    tracing::error!(user_id = %user_id, customer_id = %customer_id, error = %e, "stripe_customer_deletion_failed");
                    sentry::capture_message(
                        &format!("stripe customer deletion failed for {}: {}", user_id, e),
                        sentry::Level::Error,
                    );
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(DeleteAccountResponse {
                            deleted: false,
                            error: Some("stripe_customer_deletion_failed".to_string()),
                        }),
                    )
                        .into_response();
                }
            }
        }
        Ok(None) => {
            tracing::info!(user_id = %user_id, "no_stripe_customer_to_delete");
        }
        Err(e) => {
            tracing::warn!(user_id = %user_id, error = %e, "failed_to_lookup_stripe_customer");
            // Continue — not having a stripe customer shouldn't block deletion
        }
    }

    // 2. Delete storage objects (audio files).
    if let Err(e) = state
        .supabase
        .admin_delete_storage_objects("audio-files", user_id)
        .await
    {
        tracing::warn!(user_id = %user_id, error = %e, "storage_cleanup_failed");
    }

    // 3. Delete Loops contact (best-effort, before auth user deletion).
    match state.supabase.get_user_email(&auth.token).await {
        Ok(Some(email)) => {
            if let Err(e) = state.loops.delete_contact_by_email(&email).await {
                tracing::warn!(user_id = %user_id, error = %e, "loops_contact_deletion_failed");
            }
        }
        Ok(None) => {
            tracing::warn!(user_id = %user_id, "no_email_for_loops_deletion");
        }
        Err(e) => {
            tracing::warn!(user_id = %user_id, error = %e, "failed_to_get_email_for_loops");
        }
    }

    // 4. Delete Supabase auth user.
    //    This cascades: profiles, nango_connections, transcription_jobs.
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
