#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Apple Speech Recognition is not available")]
    NotAvailable,
    #[error("Recognition error: {0}")]
    Recognition(String),
    #[error("Session not found: {0}")]
    SessionNotFound(u64),
    #[error("Platform not supported")]
    PlatformNotSupported,
}
