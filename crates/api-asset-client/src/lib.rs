mod client;
mod error;

pub use client::{AssetClient, ModelAsset};
pub use error::Error;

use std::sync::OnceLock;

static DEFAULT: OnceLock<AssetClient> = OnceLock::new();

fn default_client() -> &'static AssetClient {
    DEFAULT.get_or_init(|| AssetClient::new("https://api.hyprnote.com"))
}

pub async fn resolve_model(asset_id: &str) -> Result<ModelAsset, Error> {
    default_client().resolve(asset_id).await
}
