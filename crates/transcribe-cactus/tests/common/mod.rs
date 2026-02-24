use std::path::PathBuf;

pub fn model_path() -> PathBuf {
    let path = std::env::var("CACTUS_STT_MODEL")
        .unwrap_or_else(|_| "/tmp/cactus-model/moonshine-base-cactus".to_string());
    let path = PathBuf::from(path);
    assert!(path.exists(), "model not found: {}", path.display());
    path
}
