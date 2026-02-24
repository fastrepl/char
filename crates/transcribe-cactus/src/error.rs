#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Cactus(#[from] hypr_cactus::Error),

    #[error(transparent)]
    QueryParse(#[from] serde_qs::Error),
}
