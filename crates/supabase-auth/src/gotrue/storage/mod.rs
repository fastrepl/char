mod memory;

pub use memory::MemoryStorage;

pub trait AuthStorage: Send + Sync + 'static {
    fn get_item(&self, key: &str) -> Result<Option<String>, String>;
    fn set_item(&self, key: &str, value: &str) -> Result<(), String>;
    fn remove_item(&self, key: &str) -> Result<(), String>;
}
