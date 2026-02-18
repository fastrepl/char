use crate::error::Error;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelAsset {
    pub id: String,
    pub url: String,
    pub checksum: u32,
    pub size_bytes: u64,
}

pub struct AssetClient {
    base_url: String,
    http: reqwest::Client,
    cache: tokio::sync::OnceCell<Vec<ModelAsset>>,
}

impl AssetClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            http: reqwest::Client::new(),
            cache: tokio::sync::OnceCell::new(),
        }
    }

    async fn manifest(&self) -> Result<&[ModelAsset], Error> {
        let assets = self
            .cache
            .get_or_try_init(|| async {
                let url = format!("{}/v1/assets/models", self.base_url);
                let assets: Vec<ModelAsset> = self.http.get(&url).send().await?.json().await?;
                Ok::<_, Error>(assets)
            })
            .await?;
        Ok(assets)
    }

    pub async fn resolve(&self, asset_id: &str) -> Result<ModelAsset, Error> {
        let manifest = self.manifest().await?;
        manifest
            .iter()
            .find(|a| a.id == asset_id)
            .cloned()
            .ok_or_else(|| Error::NotFound(asset_id.to_owned()))
    }
}
