use axum::Json;
use axum::extract::{Path, Query};
use axum::http::StatusCode;
use serde::Deserialize;
use uuid::Uuid;

use crate::error::Result;
use crate::types::{PullOpsResponse, PushOpsRequest, PushOpsResponse};

#[derive(Deserialize)]
pub struct PullOpsQuery {
    pub cursor: Option<i64>,
    pub limit: Option<i64>,
}

/// POST /vaults/:vault_id/ops -- push operations
pub async fn push_ops(
    Path(_vault_id): Path<Uuid>,
    Json(_body): Json<PushOpsRequest>,
) -> Result<(StatusCode, Json<PushOpsResponse>)> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}

/// GET /vaults/:vault_id/ops?cursor=N&limit=100 -- pull operations
pub async fn pull_ops(
    Path(_vault_id): Path<Uuid>,
    Query(_query): Query<PullOpsQuery>,
) -> Result<Json<PullOpsResponse>> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}
