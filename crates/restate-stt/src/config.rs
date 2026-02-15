#[derive(Clone)]
pub struct Config {
    pub restate_ingress_url: String,
    pub soniox_api_key: String,
    pub deepgram_api_key: Option<String>,
    pub supabase_url: String,
    pub supabase_service_role_key: String,
}
