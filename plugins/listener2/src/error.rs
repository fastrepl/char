use serde::{Serialize, ser::Serializer};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    Batch(#[from] owhisper_client::Error),
    #[error(transparent)]
    SpawnError(#[from] ractor::SpawnErr),
    #[error("batch start failed: {0}")]
    BatchStartFailed(String),
    #[error("diarization failed: {0}")]
    DiarizeFailed(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
