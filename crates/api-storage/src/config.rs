use hypr_api_env::NangoEnv;

#[derive(Clone)]
pub struct StorageConfig {
    pub nango: NangoEnv,
}

impl StorageConfig {
    pub fn new(nango: &NangoEnv) -> Self {
        Self {
            nango: nango.clone(),
        }
    }
}
