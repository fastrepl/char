use axum::{Json, extract::Path};
use serde::Serialize;

use super::RouteError;
use crate::supabase::SupabaseClient;

#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SttStatusResponse {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Object>)]
    pub raw_result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[utoipa::path(
    get,
    path = "/stt/status/{pipeline_id}",
    params(
        ("pipeline_id" = String, Path, description = "Pipeline ID")
    ),
    responses(
        (status = 200, description = "Pipeline status", body = SttStatusResponse),
        (status = 404, description = "Job not found"),
        (status = 500, description = "Internal error"),
    ),
    tag = "stt",
)]
pub async fn handler(
    supabase: SupabaseClient,
    Path(pipeline_id): Path<String>,
) -> Result<Json<SttStatusResponse>, RouteError> {
    let job = supabase
        .get_job(&pipeline_id)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "failed to query job");
            RouteError::Internal(format!("failed to query job: {e}"))
        })?
        .ok_or(RouteError::NotFound("job not found"))?;

    Ok(Json(SttStatusResponse {
        status: job.status,
        provider: Some(job.provider),
        raw_result: job.raw_result,
        error: job.error,
    }))
}
