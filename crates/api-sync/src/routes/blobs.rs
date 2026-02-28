use axum::body::Bytes;
use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::error::Result;

/// POST /vaults/:vault_id/blobs -- upload blob
pub async fn upload_blob(Path(_vault_id): Path<Uuid>, _body: Bytes) -> Result<StatusCode> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}

/// HEAD /vaults/:vault_id/blobs/:hash -- check blob existence
pub async fn check_blob(Path((_vault_id, _hash)): Path<(Uuid, String)>) -> Result<StatusCode> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}

/// GET /vaults/:vault_id/blobs/:hash -- download blob
pub async fn download_blob(Path((_vault_id, _hash)): Path<(Uuid, String)>) -> Result<Bytes> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}
