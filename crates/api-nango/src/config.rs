use hypr_api_env::{NangoEnv, SupabaseEnv};

#[derive(Clone)]
pub struct NangoConfig {
    pub nango: NangoEnv,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub supabase_service_role_key: Option<String>,
}

impl NangoConfig {
    pub fn new(
        nango: &NangoEnv,
        supabase: &SupabaseEnv,
        supabase_service_role_key: Option<String>,
    ) -> Self {
        Self {
            nango: nango.clone(),
            supabase_url: supabase.supabase_url.clone(),
            supabase_anon_key: supabase.supabase_anon_key.clone(),
            supabase_service_role_key,
        }
    }
}
