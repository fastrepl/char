#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("model not downloaded: {0}")]
    ModelNotDownloaded(String),
    #[error("download failed: {0}")]
    DownloadFailed(#[from] hypr_file::Error),
    #[error("unpack failed: {0}")]
    UnpackFailed(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("no download URL available for model: {0}")]
    NoDownloadUrl(String),
    #[error("delete failed: {0}")]
    DeleteFailed(String),
    #[error("cancelled")]
    Cancelled,
}
