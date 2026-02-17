use hypr_http::HttpClient;

use crate::error::Error;
use crate::types::{GetFileRequest, GoogleDriveFile, ListFilesRequest, ListFilesResponse};

pub struct GoogleDriveClient<C> {
    http: C,
}

impl<C: HttpClient> GoogleDriveClient<C> {
    pub fn new(http: C) -> Self {
        Self { http }
    }

    pub async fn list_files(&self, req: ListFilesRequest) -> Result<ListFilesResponse, Error> {
        let mut query_parts: Vec<String> = Vec::new();

        if let Some(ref q) = req.q {
            query_parts.push(format!("q={}", urlencoding::encode(q)));
        }
        if let Some(page_size) = req.page_size {
            query_parts.push(format!("pageSize={page_size}"));
        }
        if let Some(ref page_token) = req.page_token {
            query_parts.push(format!("pageToken={}", urlencoding::encode(page_token)));
        }
        if let Some(ref order_by) = req.order_by {
            query_parts.push(format!("orderBy={}", urlencoding::encode(order_by)));
        }
        if let Some(ref fields) = req.fields {
            query_parts.push(format!("fields={}", urlencoding::encode(fields)));
        }

        let path = if query_parts.is_empty() {
            "/drive/v3/files".to_string()
        } else {
            format!("/drive/v3/files?{}", query_parts.join("&"))
        };

        let bytes = self.http.get(&path).await.map_err(Error::Http)?;
        let response: ListFilesResponse = serde_json::from_slice(&bytes)?;
        Ok(response)
    }

    pub async fn get_file(&self, req: GetFileRequest) -> Result<GoogleDriveFile, Error> {
        let file_id = &req.file_id;
        let mut query_parts: Vec<String> = Vec::new();

        if let Some(ref fields) = req.fields {
            query_parts.push(format!("fields={}", urlencoding::encode(fields)));
        }

        let path = if query_parts.is_empty() {
            format!("/drive/v3/files/{file_id}")
        } else {
            format!("/drive/v3/files/{file_id}?{}", query_parts.join("&"))
        };

        let bytes = self.http.get(&path).await.map_err(Error::Http)?;
        let file: GoogleDriveFile = serde_json::from_slice(&bytes)?;
        Ok(file)
    }

    pub async fn download_file(&self, file_id: &str) -> Result<Vec<u8>, Error> {
        let path = format!("/drive/v3/files/{file_id}?alt=media");
        let bytes = self.http.get(&path).await.map_err(Error::Http)?;
        Ok(bytes)
    }
}
