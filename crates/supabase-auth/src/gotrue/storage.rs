use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Trait for session storage, analogous to the JS SDK's `SupportedStorage`.
///
/// Implementors provide persistent key-value storage for auth session data.
/// Methods are synchronous to allow use from both sync and async contexts.
pub trait AuthStorage: Send + Sync + 'static {
    fn get_item(&self, key: &str) -> Result<Option<String>, String>;
    fn set_item(&self, key: &str, value: &str) -> Result<(), String>;
    fn remove_item(&self, key: &str) -> Result<(), String>;
}

/// In-memory storage implementation, useful for testing.
#[derive(Clone)]
pub struct MemoryStorage {
    data: Arc<RwLock<HashMap<String, String>>>,
}

impl MemoryStorage {
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl Default for MemoryStorage {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthStorage for MemoryStorage {
    fn get_item(&self, key: &str) -> Result<Option<String>, String> {
        let data = self.data.read().map_err(|e| e.to_string())?;
        Ok(data.get(key).cloned())
    }

    fn set_item(&self, key: &str, value: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| e.to_string())?;
        data.insert(key.to_string(), value.to_string());
        Ok(())
    }

    fn remove_item(&self, key: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| e.to_string())?;
        data.remove(key);
        Ok(())
    }
}
