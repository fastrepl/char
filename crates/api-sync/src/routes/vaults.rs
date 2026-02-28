use axum::Json;
use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::error::Result;
use crate::types::{
    CreateVaultRequest, CreateVaultResponse, ListVaultsResponse, RegisterDeviceRequest,
    RegisterDeviceResponse,
};

/// POST /vaults -- create vault
pub async fn create_vault(
    Json(_body): Json<CreateVaultRequest>,
) -> Result<(StatusCode, Json<CreateVaultResponse>)> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}

/// GET /vaults -- list user's vaults
pub async fn list_vaults() -> Result<Json<ListVaultsResponse>> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}

/// POST /vaults/:vault_id/devices -- register device
pub async fn register_device(
    Path(_vault_id): Path<Uuid>,
    Json(_body): Json<RegisterDeviceRequest>,
) -> Result<(StatusCode, Json<RegisterDeviceResponse>)> {
    Err(crate::error::SyncError::Internal(
        "not implemented".to_string(),
    ))
}
