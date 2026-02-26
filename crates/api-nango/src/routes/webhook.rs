use axum::{Json, extract::State, http::HeaderMap};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::{NangoError, Result};
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct WebhookResponse {
    pub status: String,
}

#[utoipa::path(
    post,
    path = "/webhook",
    responses(
        (status = 200, description = "Webhook processed", body = WebhookResponse),
        (status = 401, description = "Invalid signature"),
        (status = 400, description = "Bad request"),
    ),
    tag = "nango",
)]
pub async fn nango_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> Result<Json<WebhookResponse>> {
    let signature = headers
        .get("x-nango-hmac-sha256")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| NangoError::Auth("Missing X-Nango-Hmac-Sha256 header".to_string()))?;

    let valid = hypr_nango::verify_webhook_signature(
        &state.config.nango.nango_secret_key,
        body.as_bytes(),
        signature,
    );
    if !valid {
        return Err(NangoError::Auth("Invalid webhook signature".to_string()));
    }

    let payload: hypr_nango::NangoAuthWebhook =
        serde_json::from_str(&body).map_err(|e| NangoError::BadRequest(e.to_string()))?;

    tracing::info!(
        webhook_type = %payload.r#type,
        operation = %payload.operation,
        connection_id = %payload.connection_id,
        end_user_id = %payload.end_user.end_user_id,
        "nango webhook received"
    );

    if payload.r#type == "auth" && state.supabase.is_configured() {
        if payload.success && payload.operation != "deletion" {
            state
                .supabase
                .upsert_connection(
                    &payload.end_user.end_user_id,
                    &payload.provider_config_key,
                    &payload.connection_id,
                    &payload.provider,
                )
                .await
                .map_err(|e| {
                    tracing::error!(error = %e, "failed to upsert nango connection");
                    NangoError::Internal(e.to_string())
                })?;
        }

        // Nango sends deletion webhooks with `success: true` on successful revocation.
        // We gate on `success` to avoid deleting local state if revocation failed on Nango's side.
        if payload.success && payload.operation == "deletion" {
            state
                .supabase
                .delete_connection(&payload.end_user.end_user_id, &payload.provider_config_key)
                .await
                .map_err(|e| {
                    tracing::error!(error = %e, "failed to delete nango connection");
                    NangoError::Internal(e.to_string())
                })?;
        }
    } else if payload.r#type == "auth" {
        tracing::warn!("supabase_service_role_key not configured, skipping connection persistence");
    }

    Ok(Json(WebhookResponse {
        status: "ok".to_string(),
    }))
}
