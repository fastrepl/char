use sha2::{Digest, Sha256};
use std::path::Path;

pub fn hash_file(path: &Path) -> std::io::Result<String> {
    let content = std::fs::read(path)?;
    let digest = Sha256::digest(&content);
    Ok(format!("sha256:{:x}", digest))
}

pub fn hash_bytes(data: &[u8]) -> String {
    let digest = Sha256::digest(data);
    format!("sha256:{:x}", digest)
}
