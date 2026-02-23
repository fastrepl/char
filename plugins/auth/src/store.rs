use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct AuthStore {
    path: PathBuf,
    data: Mutex<HashMap<String, String>>,
}

impl AuthStore {
    pub fn load(path: PathBuf) -> Self {
        let data = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Self {
            path,
            data: Mutex::new(data),
        }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        self.data.lock().unwrap().get(key).cloned()
    }

    pub fn set(&self, key: String, value: String) -> crate::Result<()> {
        let mut data = self.data.lock().unwrap();
        data.insert(key, value);
        atomic_save(&self.path, &data)
    }

    pub fn remove(&self, key: &str) -> crate::Result<()> {
        let mut data = self.data.lock().unwrap();
        data.remove(key);
        atomic_save(&self.path, &data)
    }

    pub fn clear(&self) -> crate::Result<()> {
        let mut data = self.data.lock().unwrap();
        data.clear();
        if self.path.exists() {
            std::fs::remove_file(&self.path)?;
        }
        Ok(())
    }

    pub fn snapshot(&self) -> HashMap<String, String> {
        self.data.lock().unwrap().clone()
    }
}

fn atomic_save(path: &Path, data: &HashMap<String, String>) -> crate::Result<()> {
    let content = serde_json::to_string(data)?;
    atomic_write(path, &content)?;
    Ok(())
}

pub(crate) fn atomic_write(target: &Path, content: &str) -> std::io::Result<()> {
    let parent = target.parent().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "target has no parent")
    })?;
    std::fs::create_dir_all(parent)?;

    let mut temp = tempfile::NamedTempFile::new_in(parent)?;
    temp.write_all(content.as_bytes())?;
    temp.as_file().sync_all()?;
    temp.persist(target).map_err(|e| e.error)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tempfile::tempdir;

    fn make_store(dir: &std::path::Path) -> AuthStore {
        AuthStore::load(dir.join("auth.json"))
    }

    #[test]
    fn set_persists_to_disk() {
        let dir = tempdir().unwrap();
        let store = make_store(dir.path());

        store.set("k".into(), "v".into()).unwrap();

        let on_disk: HashMap<String, String> =
            serde_json::from_str(&std::fs::read_to_string(dir.path().join("auth.json")).unwrap())
                .unwrap();
        assert_eq!(on_disk["k"], "v");
    }

    #[test]
    fn remove_persists_to_disk() {
        let dir = tempdir().unwrap();
        let store = make_store(dir.path());

        store.set("k".into(), "v".into()).unwrap();
        store.remove("k").unwrap();

        let on_disk: HashMap<String, String> =
            serde_json::from_str(&std::fs::read_to_string(dir.path().join("auth.json")).unwrap())
                .unwrap();
        assert!(!on_disk.contains_key("k"));
    }

    #[test]
    fn clear_removes_file() {
        let dir = tempdir().unwrap();
        let store = make_store(dir.path());

        store.set("k".into(), "v".into()).unwrap();
        assert!(dir.path().join("auth.json").exists());

        store.clear().unwrap();
        assert!(!dir.path().join("auth.json").exists());
        assert!(store.get("k").is_none());
    }

    #[test]
    fn load_restores_state_from_disk() {
        let dir = tempdir().unwrap();

        {
            let store = make_store(dir.path());
            store.set("token".into(), "abc123".into()).unwrap();
        }

        let store2 = make_store(dir.path());
        assert_eq!(store2.get("token"), Some("abc123".into()));
    }

    #[test]
    fn no_tmp_file_left_after_write() {
        let dir = tempdir().unwrap();
        let store = make_store(dir.path());

        store.set("k".into(), "v".into()).unwrap();

        let leftovers: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_name()
                    .to_str()
                    .map(|n| n != "auth.json")
                    .unwrap_or(false)
            })
            .collect();
        assert!(
            leftovers.is_empty(),
            "unexpected temp files: {:?}",
            leftovers
        );
    }

    #[test]
    fn concurrent_writes_are_consistent() {
        let dir = tempdir().unwrap();
        let store = Arc::new(make_store(dir.path()));
        let mut handles = vec![];

        for i in 0..20 {
            let s = Arc::clone(&store);
            handles.push(std::thread::spawn(move || {
                s.set(format!("key_{i}"), format!("val_{i}")).unwrap();
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        let on_disk: HashMap<String, String> =
            serde_json::from_str(&std::fs::read_to_string(dir.path().join("auth.json")).unwrap())
                .unwrap();

        for i in 0..20 {
            let key = format!("key_{i}");
            let expected = format!("val_{i}");
            assert_eq!(
                store.get(&key),
                Some(expected.clone()),
                "missing in memory: {key}"
            );
            assert_eq!(on_disk.get(&key), Some(&expected), "missing on disk: {key}");
        }
    }

    #[test]
    fn atomic_write_overwrites_existing() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("auth.json");

        atomic_write(&target, r#"{"a":"1"}"#).unwrap();
        atomic_write(&target, r#"{"a":"2"}"#).unwrap();

        assert_eq!(std::fs::read_to_string(&target).unwrap(), r#"{"a":"2"}"#);
    }

    #[test]
    fn atomic_write_creates_parent_dirs() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("nested").join("deep").join("auth.json");

        atomic_write(&target, "{}").unwrap();

        assert_eq!(std::fs::read_to_string(&target).unwrap(), "{}");
    }
}
