use hypr_api_env::NangoEnv;

#[derive(Clone)]
pub struct NangoConfig {
    pub nango: NangoEnv,
}

impl NangoConfig {
    pub fn new(nango: &NangoEnv) -> Self {
        Self {
            nango: nango.clone(),
        }
    }
}
