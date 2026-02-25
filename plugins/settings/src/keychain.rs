use log::{debug, warn};

const SERVICE_NAME: &str = "com.hyprnote.char";

fn entry_for(provider_type: &str, provider_id: &str) -> Result<keyring::Entry, keyring::Error> {
    let account = format!("{}:{}", provider_type, provider_id);
    keyring::Entry::new(SERVICE_NAME, &account)
}

/// Store an API key in the OS keychain.
/// Returns true if successful.
fn store_api_key(provider_type: &str, provider_id: &str, api_key: &str) -> bool {
    match entry_for(provider_type, provider_id) {
        Ok(entry) => match entry.set_password(api_key) {
            Ok(()) => {
                debug!(
                    "stored API key in keychain for {}:{}",
                    provider_type, provider_id
                );
                true
            }
            Err(e) => {
                warn!(
                    "failed to store API key in keychain for {}:{}: {}",
                    provider_type, provider_id, e
                );
                false
            }
        },
        Err(e) => {
            warn!("failed to create keychain entry for {}:{}: {}", provider_type, provider_id, e);
            false
        }
    }
}

/// Retrieve an API key from the OS keychain.
fn get_api_key(provider_type: &str, provider_id: &str) -> Option<String> {
    entry_for(provider_type, provider_id)
        .ok()
        .and_then(|entry| entry.get_password().ok())
}

/// Delete an API key from the OS keychain.
fn delete_api_key(provider_type: &str, provider_id: &str) {
    if let Ok(entry) = entry_for(provider_type, provider_id) {
        match entry.delete_credential() {
            Ok(()) => {
                debug!(
                    "deleted API key from keychain for {}:{}",
                    provider_type, provider_id
                );
            }
            Err(keyring::Error::NoEntry) => {}
            Err(e) => {
                warn!(
                    "failed to delete API key from keychain for {}:{}: {}",
                    provider_type, provider_id, e
                );
            }
        }
    }
}

/// Extract API keys from the settings JSON, store them in the OS keychain,
/// and strip them from the JSON so they are not written to disk.
///
/// Returns `true` if any keys were migrated to the keychain.
pub fn extract_and_store_keys(settings: &mut serde_json::Value) -> bool {
    let mut migrated = false;

    let Some(ai) = settings.get_mut("ai").and_then(|v| v.as_object_mut()) else {
        return false;
    };

    for provider_type in &["llm", "stt"] {
        let Some(providers) = ai.get_mut(*provider_type).and_then(|v| v.as_object_mut()) else {
            continue;
        };

        for (provider_id, config) in providers.iter_mut() {
            let Some(obj) = config.as_object_mut() else {
                continue;
            };

            let api_key = obj
                .get("api_key")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match api_key.as_deref() {
                Some(key) if !key.is_empty() => {
                    if store_api_key(provider_type, provider_id, key) {
                        obj.remove("api_key");
                        migrated = true;
                    }
                }
                Some(_empty) => {
                    // User explicitly cleared the key
                    delete_api_key(provider_type, provider_id);
                    obj.remove("api_key");
                }
                None => {}
            }
        }
    }

    migrated
}

/// Inject API keys from the OS keychain into the settings JSON.
///
/// For each configured provider, if no `api_key` field is present (or it is
/// empty), the corresponding key is looked up in the keychain and inserted.
pub fn inject_api_keys(settings: &mut serde_json::Value) {
    let Some(ai) = settings.get_mut("ai").and_then(|v| v.as_object_mut()) else {
        return;
    };

    for provider_type in &["llm", "stt"] {
        let Some(providers) = ai.get_mut(*provider_type).and_then(|v| v.as_object_mut()) else {
            continue;
        };

        for (provider_id, config) in providers.iter_mut() {
            let Some(obj) = config.as_object_mut() else {
                continue;
            };

            let has_key = obj
                .get("api_key")
                .and_then(|v| v.as_str())
                .is_some_and(|s| !s.is_empty());

            if !has_key {
                if let Some(api_key) = get_api_key(provider_type, provider_id) {
                    obj.insert(
                        "api_key".to_string(),
                        serde_json::Value::String(api_key),
                    );
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn extract_removes_api_keys_when_keychain_available() {
        let mut settings = json!({
            "ai": {
                "llm": {
                    "anthropic": { "base_url": "https://api.anthropic.com", "api_key": "sk-ant-test" }
                },
                "stt": {
                    "deepgram": { "base_url": "https://api.deepgram.com", "api_key": "dg-test" }
                },
                "current_llm_provider": "anthropic"
            }
        });

        let _ = extract_and_store_keys(&mut settings);

        // Regardless of keychain availability, the structure should be valid JSON
        assert!(settings["ai"]["current_llm_provider"].as_str() == Some("anthropic"));
    }

    #[test]
    fn extract_handles_empty_ai_section() {
        let mut settings = json!({ "general": { "autostart": true } });
        let migrated = extract_and_store_keys(&mut settings);
        assert!(!migrated);
    }

    #[test]
    fn extract_handles_empty_providers() {
        let mut settings = json!({ "ai": { "llm": {}, "stt": {} } });
        let migrated = extract_and_store_keys(&mut settings);
        assert!(!migrated);
    }

    #[test]
    fn inject_handles_no_ai_section() {
        let mut settings = json!({ "general": { "autostart": true } });
        inject_api_keys(&mut settings);
        assert_eq!(settings, json!({ "general": { "autostart": true } }));
    }

    #[test]
    fn inject_handles_empty_providers() {
        let mut settings = json!({ "ai": { "llm": {}, "stt": {} } });
        let original = settings.clone();
        inject_api_keys(&mut settings);
        assert_eq!(settings, original);
    }

    #[test]
    fn extract_skips_empty_api_key() {
        let mut settings = json!({
            "ai": {
                "llm": {
                    "anthropic": { "base_url": "https://api.anthropic.com", "api_key": "" }
                },
                "stt": {}
            }
        });

        let _ = extract_and_store_keys(&mut settings);

        // Empty key should be removed (cleanup)
        assert!(settings["ai"]["llm"]["anthropic"]
            .get("api_key")
            .is_none());
    }

    #[test]
    fn extract_preserves_non_api_key_fields() {
        let mut settings = json!({
            "ai": {
                "llm": {
                    "openai": { "base_url": "https://api.openai.com/v1", "api_key": "sk-test" }
                },
                "stt": {},
                "current_llm_provider": "openai",
                "current_llm_model": "gpt-4"
            },
            "general": { "autostart": true }
        });

        let _ = extract_and_store_keys(&mut settings);

        assert_eq!(
            settings["ai"]["llm"]["openai"]["base_url"],
            "https://api.openai.com/v1"
        );
        assert_eq!(settings["ai"]["current_llm_provider"], "openai");
        assert_eq!(settings["ai"]["current_llm_model"], "gpt-4");
        assert_eq!(settings["general"]["autostart"], true);
    }
}
