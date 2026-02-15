use std::path::Path;
use std::sync::OnceLock;

use serde::Deserialize;

#[derive(Deserialize, Clone)]
pub struct RestateEnv {
    pub restate_identity_key: Option<String>,
    pub restate_ingress_url: String,
}

#[derive(Deserialize, Clone)]
pub struct SttEnv {
    pub soniox_api_key: String,
    pub deepgram_api_key: Option<String>,
}

#[derive(Deserialize, Clone)]
pub struct SupabaseEnv {
    pub supabase_url: String,
    pub supabase_service_role_key: String,
}

#[derive(Deserialize, Clone)]
pub struct Env {
    #[serde(default = "default_port")]
    pub port: u16,

    #[serde(flatten)]
    pub restate: RestateEnv,
    #[serde(flatten)]
    pub stt: SttEnv,
    #[serde(flatten)]
    pub supabase: SupabaseEnv,
}

fn default_port() -> u16 {
    9080
}

static ENV: OnceLock<Env> = OnceLock::new();

pub fn env() -> &'static Env {
    ENV.get_or_init(|| {
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let repo_root = manifest_dir
            .parent()
            .and_then(|p| p.parent())
            .unwrap_or(manifest_dir);
        let _ = dotenvy::from_path(repo_root.join(".env.supabase"));
        let _ = dotenvy::from_path(repo_root.join(".env.restate"));
        let _ = dotenvy::from_path(manifest_dir.join(".env"));
        envy::from_env().expect("Failed to load environment")
    })
}
