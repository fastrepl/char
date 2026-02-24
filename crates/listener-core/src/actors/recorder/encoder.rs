use std::path::Path;

pub trait AudioEncoder: Send + Sync + 'static {
    fn extension(&self) -> &str;
    fn encode(&self, input: &Path, output: &Path) -> Result<(), Box<dyn std::error::Error>>;
    fn decode(&self, input: &Path, output: &Path) -> Result<(), Box<dyn std::error::Error>>;
}
