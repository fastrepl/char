use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use ureq::Agent;

const CACHE_KEY_VERSION: u32 = 1;

fn default_cache_dir() -> Option<PathBuf> {
    dirs::cache_dir().map(|p| p.join("hyprnote").join("eval.cache"))
}

/// State of the disk cache initialization.
#[derive(Debug, Clone)]
enum DiskCacheState {
    /// Disk cache is available at the given path.
    Available(PathBuf),
    /// Disk cache is disabled (no cache directory configured or creation failed).
    Disabled,
}

pub struct CachingClient {
    disk_cache: DiskCacheState,
    memory_cache: Mutex<HashMap<String, String>>,
    agent: Agent,
}

impl CachingClient {
    pub fn new(cache_dir: Option<String>) -> Self {
        let disk_cache = match cache_dir.map(PathBuf::from).or_else(default_cache_dir) {
            Some(dir) => match fs::create_dir_all(&dir) {
                Ok(()) => DiskCacheState::Available(dir),
                Err(_) => DiskCacheState::Disabled,
            },
            None => DiskCacheState::Disabled,
        };

        let agent = Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(30)))
            .build()
            .into();

        Self {
            disk_cache,
            memory_cache: Mutex::new(HashMap::new()),
            agent,
        }
    }

    fn compute_cache_key(&self, method: &str, url: &str, body: &str) -> String {
        let key_input = serde_json::json!({
            "v": CACHE_KEY_VERSION,
            "method": method,
            "url": url,
            "body": body
        });

        let canonical = serde_json::to_string(&key_input).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(canonical.as_bytes());
        let result = hasher.finalize();
        hex::encode(result)
    }

    fn cache_path(&self, key: &str) -> Option<PathBuf> {
        match &self.disk_cache {
            DiskCacheState::Available(dir) => Some(dir.join(format!("{}.json", key))),
            DiskCacheState::Disabled => None,
        }
    }

    fn get_cached(&self, key: &str) -> Option<String> {
        if let Some(path) = self.cache_path(key) {
            if let Ok(content) = fs::read_to_string(&path) {
                return Some(content);
            }
        }

        let cache = self.memory_cache.lock().ok()?;
        cache.get(key).cloned()
    }

    fn set_cached(&self, key: &str, value: &str) {
        if let Some(path) = self.cache_path(key) {
            if fs::write(&path, value).is_err() {
                eprintln!("Warning: failed to write cache file: {}", path.display());
            }
        }

        if let Ok(mut cache) = self.memory_cache.lock() {
            cache.insert(key.to_string(), value.to_string());
        }
    }

    pub fn post(&self, url: &str, api_key: &str, body: &str) -> Result<String, crate::ClientError> {
        let cache_key = self.compute_cache_key("POST", url, body);

        if let Some(cached) = self.get_cached(&cache_key) {
            return Ok(cached);
        }

        let response = self
            .agent
            .post(url)
            .header("Authorization", &format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .send(body)?;

        let response_body = response.into_body().read_to_string()?;

        self.set_cached(&cache_key, &response_body);

        Ok(response_body)
    }
}

mod hex {
    pub fn encode(bytes: impl AsRef<[u8]>) -> String {
        bytes
            .as_ref()
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect()
    }
}
