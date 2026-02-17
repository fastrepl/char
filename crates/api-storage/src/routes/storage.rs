use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::{Result, StorageError};
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListFilesRequest {
    pub connection_id: String,
    #[serde(default)]
    pub q: Option<String>,
    #[serde(default)]
    pub page_size: Option<u32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub order_by: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListFilesResponse {
    pub files: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct GetFileRequest {
    pub connection_id: String,
    pub file_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GetFileResponse {
    pub file: serde_json::Value,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct DownloadFileRequest {
    pub connection_id: String,
    pub file_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DownloadFileResponse {
    pub data: Vec<u8>,
}

#[utoipa::path(
    post,
    path = "/files",
    request_body = ListFilesRequest,
    responses(
        (status = 200, description = "Files listed", body = ListFilesResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "storage",
)]
pub async fn list_files(
    State(state): State<AppState>,
    Json(payload): Json<ListFilesRequest>,
) -> Result<Json<ListFilesResponse>> {
    let proxy = state
        .nango
        .integration("google-drive")
        .connection(&payload.connection_id);
    let http = hypr_nango::NangoHttpClient::new(proxy);
    let client = hypr_google_drive::GoogleDriveClient::new(http);

    let req = hypr_google_drive::ListFilesRequest {
        q: payload.q,
        page_size: payload.page_size,
        page_token: payload.page_token,
        order_by: payload.order_by,
        fields: None,
    };

    let response = client
        .list_files(req)
        .await
        .map_err(|e| StorageError::Internal(e.to_string()))?;

    let files: Vec<serde_json::Value> = response
        .files
        .iter()
        .map(|f| serde_json::to_value(f).unwrap_or_default())
        .collect();

    Ok(Json(ListFilesResponse {
        files,
        next_page_token: response.next_page_token,
    }))
}

#[utoipa::path(
    post,
    path = "/files/get",
    request_body = GetFileRequest,
    responses(
        (status = 200, description = "File metadata fetched", body = GetFileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "storage",
)]
pub async fn get_file(
    State(state): State<AppState>,
    Json(payload): Json<GetFileRequest>,
) -> Result<Json<GetFileResponse>> {
    let proxy = state
        .nango
        .integration("google-drive")
        .connection(&payload.connection_id);
    let http = hypr_nango::NangoHttpClient::new(proxy);
    let client = hypr_google_drive::GoogleDriveClient::new(http);

    let req = hypr_google_drive::GetFileRequest {
        file_id: payload.file_id,
        fields: None,
    };

    let file = client
        .get_file(req)
        .await
        .map_err(|e| StorageError::Internal(e.to_string()))?;

    let file = serde_json::to_value(file).unwrap_or_default();

    Ok(Json(GetFileResponse { file }))
}

#[utoipa::path(
    post,
    path = "/files/download",
    request_body = DownloadFileRequest,
    responses(
        (status = 200, description = "File content downloaded", body = DownloadFileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "storage",
)]
pub async fn download_file(
    State(state): State<AppState>,
    Json(payload): Json<DownloadFileRequest>,
) -> Result<Json<DownloadFileResponse>> {
    let proxy = state
        .nango
        .integration("google-drive")
        .connection(&payload.connection_id);
    let http = hypr_nango::NangoHttpClient::new(proxy);
    let client = hypr_google_drive::GoogleDriveClient::new(http);

    let data = client
        .download_file(&payload.file_id)
        .await
        .map_err(|e| StorageError::Internal(e.to_string()))?;

    Ok(Json(DownloadFileResponse { data }))
}
