use axum::{Json, body::Bytes};
use hypr_api_auth::AuthContext;
use owhisper_client::{CallbackSttAdapter, DeepgramAdapter, Provider, SonioxAdapter};
use serde::{Deserialize, Serialize};

use hypr_supabase_storage::SupabaseStorage;

use crate::query_params::QueryParams;
use crate::supabase::{PipelineStatus, SupabaseClient, TranscriptionJob};

use super::super::{AppState, RouteError, parse_async_provider};

#[derive(Deserialize, utoipa::ToSchema)]
pub struct ListenCallbackRequest {
    pub url: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct ListenCallbackResponse {
    pub request_id: String,
}

pub(super) async fn handle_callback(
    state: &AppState,
    auth: Option<axum::Extension<AuthContext>>,
    params: &mut QueryParams,
    body: Bytes,
) -> Result<Json<ListenCallbackResponse>, RouteError> {
    let auth = auth.ok_or(RouteError::Unauthorized("authentication required"))?;
    let user_id = auth.claims.sub.clone();

    let supabase = build_supabase_client(state)?;

    let api_base_url = state
        .config
        .callback
        .api_base_url
        .as_deref()
        .ok_or(RouteError::MissingConfig("api_base_url not configured"))?
        .trim_end_matches('/');

    let provider_str = params
        .remove_first("provider")
        .unwrap_or_else(|| "deepgram".to_string());
    let provider = parse_async_provider(&provider_str)?;

    let id = uuid::Uuid::new_v4().to_string();

    let req: ListenCallbackRequest = serde_json::from_slice(&body)
        .map_err(|_| RouteError::BadRequest("expected JSON body with url field".into()))?;
    let file_id = req.url;

    let storage = SupabaseStorage::new(
        supabase.client.clone(),
        &supabase.url,
        &supabase.service_role_key,
    );

    let audio_url = storage
        .create_signed_url("audio-files", &file_id, 3600)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "failed to create signed URL");
            RouteError::Internal(format!("failed to create signed URL: {e}"))
        })?;

    let callback_secret = state
        .config
        .callback
        .secret
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
        Provider::Soniox => {
            SonioxAdapter
                .submit_callback(&state.client, api_key, &audio_url, &callback_url)
                .await
        }
        Provider::Deepgram => {
            DeepgramAdapter
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
        file_id,
        provider: provider_str.to_string(),
        status: PipelineStatus::Processing,
        provider_request_id: Some(provider_request_id),
        raw_result: None,
        error: None,
    };

    supabase.insert_job(&job).await.map_err(|e| {
        tracing::error!(error = %e, "failed to insert job");
        RouteError::Internal(format!("failed to record job: {e}"))
    })?;

    Ok(Json(ListenCallbackResponse { request_id: id }))
}

fn build_supabase_client(state: &AppState) -> Result<SupabaseClient, RouteError> {
    Ok(SupabaseClient {
        client: state.client.clone(),
        url: state
            .config
            .supabase
            .url
            .clone()
            .ok_or(RouteError::MissingConfig("supabase_url not configured"))?,
        service_role_key: state.config.supabase.service_role_key.clone().ok_or(
            RouteError::MissingConfig("supabase_service_role_key not configured"),
        )?,
    })
}
