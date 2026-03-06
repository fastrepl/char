use std::collections::HashSet;

pub struct Detect<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

fn resolve_ignored_bundle_ids(
    bundle_ids: Vec<String>,
    apps: &[hypr_detect::InstalledApp],
) -> HashSet<String> {
    bundle_ids
        .into_iter()
        .filter_map(|value| {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return None;
            }

            apps.iter()
                .find(|app| {
                    app.id.eq_ignore_ascii_case(trimmed) || app.name.eq_ignore_ascii_case(trimmed)
                })
                .map(|app| app.id.clone())
                .or_else(|| Some(trimmed.to_string()))
        })
        .collect()
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Detect<'a, R, M> {
    pub fn list_installed_applications(&self) -> Vec<hypr_detect::InstalledApp> {
        hypr_detect::list_installed_apps()
    }

    pub fn list_mic_using_applications(&self) -> Vec<hypr_detect::InstalledApp> {
        hypr_detect::list_mic_using_apps()
    }

    pub fn list_default_ignored_bundle_ids(&self) -> Vec<String> {
        crate::policy::default_ignored_bundle_ids()
    }

    pub fn set_ignored_bundle_ids(&self, bundle_ids: Vec<String>) {
        let state = self.manager.state::<crate::ProcessorState>();
        let mut state_guard = state.lock().unwrap_or_else(|e| e.into_inner());
        let mut apps = hypr_detect::list_installed_apps();
        apps.extend(hypr_detect::list_mic_using_apps());
        let resolved_bundle_ids = resolve_ignored_bundle_ids(bundle_ids, &apps);

        for id in &resolved_bundle_ids {
            state_guard.mic_usage_tracker.cancel_app(id);
        }
        state_guard.policy.user_ignored_bundle_ids = resolved_bundle_ids;
    }

    pub fn set_respect_do_not_disturb(&self, enabled: bool) {
        let state = self.manager.state::<crate::ProcessorState>();
        let mut state_guard = state.lock().unwrap_or_else(|e| e.into_inner());
        state_guard.policy.respect_dnd = enabled;
    }

    pub fn set_mic_active_threshold(&self, secs: u64) {
        let state = self.manager.state::<crate::ProcessorState>();
        let mut state_guard = state.lock().unwrap_or_else(|e| e.into_inner());
        state_guard.mic_active_threshold_secs = secs;
    }
}

pub trait DetectPluginExt<R: tauri::Runtime> {
    fn detect(&self) -> Detect<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DetectPluginExt<R> for T {
    fn detect(&self) -> Detect<'_, R, Self>
    where
        Self: Sized,
    {
        Detect {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::resolve_ignored_bundle_ids;

    fn app(id: &str, name: &str) -> hypr_detect::InstalledApp {
        hypr_detect::InstalledApp {
            id: id.to_string(),
            name: name.to_string(),
        }
    }

    #[test]
    fn resolves_app_names_to_bundle_ids() {
        let apps = vec![app("com.openai.codex", "Codex")];
        let resolved = resolve_ignored_bundle_ids(vec!["Codex".to_string()], &apps);

        assert!(resolved.contains("com.openai.codex"));
    }

    #[test]
    fn resolves_case_insensitive_names_and_ids() {
        let apps = vec![app("app.spokenly", "Spokenly")];
        let resolved = resolve_ignored_bundle_ids(
            vec![" spokenly ".to_string(), "APP.SPOKENLY".to_string()],
            &apps,
        );

        assert_eq!(resolved, HashSet::from(["app.spokenly".to_string()]));
    }

    #[test]
    fn preserves_unknown_values() {
        let resolved = resolve_ignored_bundle_ids(vec!["com.example.custom".to_string()], &[]);

        assert_eq!(resolved, HashSet::from(["com.example.custom".to_string()]));
    }
}
