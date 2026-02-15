use hypr_nango::NangoClient;

use crate::config::StorageConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) nango: NangoClient,
}

impl AppState {
    pub(crate) fn new(config: StorageConfig) -> Self {
        let mut builder = hypr_nango::NangoClient::builder().api_key(&config.nango.nango_api_key);
        if let Some(api_base) = &config.nango.nango_api_base {
            builder = builder.api_base(api_base);
        }
        let nango = builder.build().expect("failed to build NangoClient");

        Self { nango }
    }
}
