use hypr_nango::NangoClient;

use crate::config::NangoConfig;
use crate::supabase::SupabaseClient;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: NangoConfig,
    pub(crate) nango: NangoClient,
    pub(crate) supabase: SupabaseClient,
}

impl AppState {
    pub(crate) fn new(config: NangoConfig) -> Self {
        let mut builder =
            hypr_nango::NangoClient::builder().api_key(&config.nango.nango_secret_key);
        if let Some(api_base) = &config.nango.nango_api_base {
            builder = builder.api_base(api_base);
        }
        let nango = builder.build().expect("failed to build NangoClient");

        let supabase = SupabaseClient::new(
            &config.supabase_url,
            &config.supabase_anon_key,
            config.supabase_service_role_key.clone(),
        );

        Self {
            config,
            nango,
            supabase,
        }
    }
}
