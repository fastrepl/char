use axum::{Json, extract::State};
use hypr_api_auth::AuthContext;
use owhisper_client::CallbackSttAdapter;
use serde::{Deserialize, Serialize};

use hypr_supabase_storage::SupabaseStorage;

use super::{AppState, RouteError, parse_async_provider};
use crate::supabase::{SupabaseClient, TranscriptionJob};

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StartRequest {
    pub file_id: String,
    #[serde(default = "default_provider")]
    pub provider: String,
}

fn default_provider() -> String {
    "soniox".to_string()
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct StartResponse {
    pub id: String,
}

#[utoipa::path(
    post,
    path = "/stt/start",
    request_body = StartRequest,
    responses(
        (status = 200, description = "Pipeline started", body = StartResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal error"),
    ),
    tag = "stt",
)]
pub async fn handler(
    State(state): State<AppState>,
    supabase: SupabaseClient,
    auth: Option<axum::Extension<AuthContext>>,
    Json(body): Json<StartRequest>,
) -> Result<Json<StartResponse>, RouteError> {
    let auth = auth.ok_or(RouteError::Unauthorized("authentication required"))?;
    let user_id = auth.claims.sub.clone();

    let api_base_url = state
        .config
        .api_base_url
        .as_deref()
        .ok_or(RouteError::MissingConfig("api_base_url not configured"))?
        .trim_end_matches('/');

    let provider_str = &body.provider;
    let provider = parse_async_provider(provider_str)?;

    let id = uuid::Uuid::new_v4().to_string();

    let storage = SupabaseStorage::new(
        supabase.client.clone(),
        &supabase.url,
        &supabase.service_role_key,
    );
    let audio_url = storage
        .create_signed_url("audio-files", &body.file_id, 3600)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "failed to create signed URL");
            RouteError::Internal(format!("failed to create signed URL: {e}"))
        })?;

    let callback_secret = state
        .config
        .callback_secret
        .as_deref()
        .ok_or(RouteError::MissingConfig("callback_secret not configured"))?;

    let callback_url =
        format!("{api_base_url}/stt/callback/{provider_str}/{id}?secret={callback_secret}");

    let api_key = state
        .config
        .api_keys
        .get(&provider)
        .ok_or(RouteError::MissingConfig(
            "api_key not configured for provider",
        ))?;

    let provider_request_id = match provider {
        owhisper_client::Provider::Soniox => {
            owhisper_client::SonioxAdapter
                .submit_callback(&state.client, api_key, &audio_url, &callback_url)
                .await
        }
        owhisper_client::Provider::Deepgram => {
            owhisper_client::DeepgramAdapter
                .submit_callback(&state.client, api_key, &audio_url, &callback_url)
                .await
        }
        _ => unreachable!(),
    }
    .map_err(|e| {
        tracing::error!(error = %e, provider = %provider_str, "submission failed");
        RouteError::BadGateway(format!("{provider_str} submission failed: {e}"))
    })?;

    let job = TranscriptionJob {
        id: id.clone(),
        user_id,
        file_id: body.file_id,
        provider: provider_str.to_string(),
        status: "processing".to_string(),
        provider_request_id: Some(provider_request_id),
        raw_result: None,
        error: None,
    };

    supabase.insert_job(&job).await.map_err(|e| {
        tracing::error!(error = %e, "failed to insert job");
        RouteError::Internal(format!("failed to record job: {e}"))
    })?;

    Ok(Json(StartResponse { id }))
}
