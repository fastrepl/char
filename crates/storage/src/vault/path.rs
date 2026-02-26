use std::path::{Path, PathBuf};

use crate::global::compute_vault_config_path;

pub const VAULT_PATH_KEY: &str = "vault_path";
pub const SETTINGS_FILENAME: &str = "settings.json";

pub fn compute_settings_path(base: &Path) -> PathBuf {
    base.join(SETTINGS_FILENAME)
}
const VAULT_BASE_ENV_VAR: &str = "VAULT_BASE";

fn expand_path(path: &str, default_base: Option<&Path>) -> PathBuf {
    let home_dir = || dirs::home_dir().map(|p| p.to_string_lossy().into_owned());
    let context = |var: &str| -> Option<String> {
        if var == "DEFAULT" {
            return default_base.map(|p| p.to_string_lossy().into_owned());
        }
        std::env::var(var).ok()
    };
    let expanded = shellexpand::full_with_context_no_errors(path, home_dir, context);
    PathBuf::from(expanded.into_owned())
}

pub fn validate_vault_path(path: &Path) -> Result<(), crate::Error> {
    if !path.is_absolute() {
        return Err(crate::Error::PathNotAbsolute);
    }

    if path.to_str().is_none() {
        return Err(crate::Error::PathNotValidUtf8);
    }

    if path.exists() && !path.is_dir() {
        return Err(crate::Error::PathIsNotDirectory);
    }

    Ok(())
}

pub fn ensure_vault_dir(path: &Path) -> Result<(), crate::Error> {
    validate_vault_path(path)?;

    if !path.exists() {
        std::fs::create_dir_all(path)?;
    }

    Ok(())
}

pub fn resolve_custom(global_base: &Path, default_base: &Path) -> Option<PathBuf> {
    if let Ok(path) = std::env::var(VAULT_BASE_ENV_VAR) {
        let path = expand_path(&path, Some(default_base));
        if ensure_vault_dir(&path).is_ok() {
            return Some(path);
        }
    }

    let vault_config_path = compute_vault_config_path(global_base);
    if let Ok(content) = std::fs::read_to_string(vault_config_path)
        && let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content)
        && let Some(custom_base) = settings.get(VAULT_PATH_KEY).and_then(|v| v.as_str())
    {
        let custom_path = expand_path(custom_base, Some(default_base));
        if ensure_vault_dir(&custom_path).is_ok() {
            return Some(custom_path);
        }
    }

    None
}

pub fn validate_vault_base_change(old_path: &Path, new_path: &Path) -> Result<(), crate::Error> {
    if new_path == old_path {
        return Ok(());
    }

    validate_vault_path(new_path)?;

    if new_path.starts_with(old_path) {
        return Err(crate::Error::VaultBaseIsSubdirectory);
    }

    if old_path.starts_with(new_path) {
        return Err(crate::Error::VaultBaseIsParent);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;
    use tempfile::tempdir;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    fn with_env<F, R>(key: &str, value: Option<&str>, f: F) -> R
    where
        F: FnOnce() -> R,
    {
        let _guard = ENV_MUTEX.lock().unwrap();
        let prev = std::env::var(key).ok();

        match value {
            Some(v) => unsafe { std::env::set_var(key, v) },
            None => unsafe { std::env::remove_var(key) },
        }

        let result = f();

        match prev {
            Some(v) => unsafe { std::env::set_var(key, v) },
            None => unsafe { std::env::remove_var(key) },
        }

        result
    }

    mod validate_vault_path_tests {
        use super::*;

        #[test]
        fn accepts_valid_absolute_path() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("vault");
            assert!(validate_vault_path(&path).is_ok());
        }

        #[test]
        fn rejects_relative_path() {
            let path = PathBuf::from("relative/path/vault");
            let result = validate_vault_path(&path);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("absolute"));
        }

        #[test]
        fn rejects_dot_relative_path() {
            let path = PathBuf::from("./vault");
            let result = validate_vault_path(&path);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("absolute"));
        }

        #[test]
        fn accepts_existing_directory() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("vault");
            fs::create_dir_all(&path).unwrap();
            assert!(validate_vault_path(&path).is_ok());
        }

        #[test]
        fn rejects_existing_file() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("not_a_dir");
            fs::write(&path, "content").unwrap();
            let result = validate_vault_path(&path);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("not a directory"));
        }
    }

    mod ensure_vault_dir_tests {
        use super::*;

        #[test]
        fn creates_directory_if_not_exists() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("new_vault");
            assert!(!path.exists());
            assert!(ensure_vault_dir(&path).is_ok());
            assert!(path.exists());
            assert!(path.is_dir());
        }

        #[test]
        fn succeeds_for_existing_directory() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("existing");
            fs::create_dir_all(&path).unwrap();
            assert!(ensure_vault_dir(&path).is_ok());
        }

        #[test]
        fn rejects_existing_file() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("file");
            fs::write(&path, "content").unwrap();
            let result = ensure_vault_dir(&path);
            assert!(result.is_err());
        }

        #[test]
        fn creates_nested_directories() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("a").join("b").join("c");
            assert!(ensure_vault_dir(&path).is_ok());
            assert!(path.is_dir());
        }
    }

    mod resolve_custom_tests {
        use super::*;

        #[test]
        fn returns_none_when_no_sources() {
            let temp = tempdir().unwrap();
            let global_base = temp.path().to_path_buf();
            let default_base = temp.path().join("default");

            with_env(VAULT_BASE_ENV_VAR, None, || {
                assert!(resolve_custom(&global_base, &default_base).is_none());
            });
        }

        #[test]
        fn returns_env_var_path_when_exists() {
            let temp = tempdir().unwrap();
            let global_base = temp.path().to_path_buf();
            let default_base = temp.path().join("default");
            let env_path = temp.path().join("env_content");
            fs::create_dir_all(&env_path).unwrap();

            with_env(VAULT_BASE_ENV_VAR, Some(env_path.to_str().unwrap()), || {
                let result = resolve_custom(&global_base, &default_base);
                assert_eq!(result, Some(env_path.clone()));
            });
        }

        #[test]
        fn creates_env_var_path_if_missing() {
            let temp = tempdir().unwrap();
            let global_base = temp.path().to_path_buf();
            let default_base = temp.path().join("default");
            let env_path = temp.path().join("new_env_vault");

            with_env(VAULT_BASE_ENV_VAR, Some(env_path.to_str().unwrap()), || {
                let result = resolve_custom(&global_base, &default_base);
                assert_eq!(result, Some(env_path.clone()));
                assert!(env_path.exists());
            });
        }

        #[test]
        fn reads_from_vault_config() {
            let temp = tempdir().unwrap();
            let global_base = temp.path().to_path_buf();
            let default_base = temp.path().join("default");
            let custom_path = temp.path().join("custom_vault");
            fs::create_dir_all(&custom_path).unwrap();

            let config = serde_json::json!({ VAULT_PATH_KEY: custom_path.to_string_lossy() });
            fs::write(compute_vault_config_path(&global_base), config.to_string()).unwrap();

            with_env(VAULT_BASE_ENV_VAR, None, || {
                let result = resolve_custom(&global_base, &default_base);
                assert_eq!(result, Some(custom_path.clone()));
            });
        }

        #[test]
        fn env_var_takes_precedence() {
            let temp = tempdir().unwrap();
            let global_base = temp.path().to_path_buf();
            let default_base = temp.path().join("default");
            let env_path = temp.path().join("env_content");
            let file_path = temp.path().join("file_vault");
            fs::create_dir_all(&env_path).unwrap();
            fs::create_dir_all(&file_path).unwrap();

            let config = serde_json::json!({ VAULT_PATH_KEY: file_path.to_string_lossy() });
            fs::write(compute_vault_config_path(&global_base), config.to_string()).unwrap();

            with_env(VAULT_BASE_ENV_VAR, Some(env_path.to_str().unwrap()), || {
                let result = resolve_custom(&global_base, &default_base);
                assert_eq!(result, Some(env_path.clone()));
            });
        }

        #[test]
        fn creates_vault_path_if_missing() {
            let temp = tempdir().unwrap();
            let global_base = temp.path().to_path_buf();
            let default_base = temp.path().join("default");
            let custom_path = temp.path().join("custom_vault");

            let config = serde_json::json!({ VAULT_PATH_KEY: custom_path.to_string_lossy() });
            fs::write(compute_vault_config_path(&global_base), config.to_string()).unwrap();

            with_env(VAULT_BASE_ENV_VAR, None, || {
                let result = resolve_custom(&global_base, &default_base);
                assert_eq!(result, Some(custom_path.clone()));
                assert!(custom_path.exists());
            });
        }
    }

    mod validate_vault_base_change_tests {
        use super::*;

        #[test]
        fn same_path_returns_ok() {
            let temp = tempdir().unwrap();
            let path = temp.path().join("vault");
            assert!(validate_vault_base_change(&path, &path).is_ok());
        }

        #[test]
        fn different_sibling_paths_returns_ok() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("content");
            let new = temp.path().join("other");
            assert!(validate_vault_base_change(&old, &new).is_ok());
        }

        #[test]
        fn rejects_subdirectory() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("vault");
            let new = temp.path().join("vault").join("subdir");
            let result = validate_vault_base_change(&old, &new);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("subdirectory"));
        }

        #[test]
        fn rejects_nested_subdirectory() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("vault");
            let new = temp.path().join("vault").join("deep").join("nested");
            let result = validate_vault_base_change(&old, &new);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("subdirectory"));
        }

        #[test]
        fn rejects_parent_directory() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("vault").join("subdir");
            let new = temp.path().join("vault");
            let result = validate_vault_base_change(&old, &new);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("parent"));
        }

        #[test]
        fn rejects_ancestor_directory() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("vault").join("deep").join("nested");
            let new = temp.path().join("vault");
            let result = validate_vault_base_change(&old, &new);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("parent"));
        }

        #[test]
        fn similar_prefix_not_ancestor() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("vault");
            let new = temp.path().join("vault-backup");
            assert!(validate_vault_base_change(&old, &new).is_ok());
        }

        #[test]
        fn rejects_relative_new_path() {
            let temp = tempdir().unwrap();
            let old = temp.path().join("vault");
            let new = PathBuf::from("relative/path");
            let result = validate_vault_base_change(&old, &new);
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("absolute"));
        }
    }
}
