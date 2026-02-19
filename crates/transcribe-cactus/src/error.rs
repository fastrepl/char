#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Cactus(#[from] hypr_cactus::Error),
}
