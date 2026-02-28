use std::path::PathBuf;

use hypr_cactus_model::CactusModel;

pub trait ModelDownloaderRuntime: Send + Sync + 'static {
    fn models_base(&self) -> Result<PathBuf, crate::Error>;
    fn emit_progress(&self, model: &CactusModel, progress: i8);
}
