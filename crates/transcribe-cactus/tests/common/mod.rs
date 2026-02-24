use std::path::PathBuf;

pub fn model_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    let default = format!(
        "{}/Library/Application Support/com.hyprnote.dev/models/cactus/whisper-small-int8-apple",
        home
    );
    let path = std::env::var("CACTUS_STT_MODEL").unwrap_or(default);
    let path = PathBuf::from(path);
    assert!(path.exists(), "model not found: {}", path.display());
    path
}
