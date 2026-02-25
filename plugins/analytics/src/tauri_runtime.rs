use hypr_analytics::{AnalyticsPayload, AnalyticsRuntime};
use tauri_plugin_store2::Store2PluginExt;

pub struct TauriAnalyticsRuntime<R: tauri::Runtime> {
    app_handle: tauri::AppHandle<R>,
    app_version: String,
    git_hash: String,
    bundle_id: String,
    app_identifier: String,
}

impl<R: tauri::Runtime> TauriAnalyticsRuntime<R> {
    pub fn new(app_handle: &tauri::AppHandle<R>) -> Self {
        use tauri_plugin_misc::MiscPluginExt;

        let app_version = env!("APP_VERSION").to_string();
        let git_hash = app_handle.misc().get_git_hash();
        let bundle_id = app_handle.config().identifier.clone();
        let app_identifier = app_handle.config().identifier.clone();

        Self {
            app_handle: app_handle.clone(),
            app_version,
            git_hash,
            bundle_id,
            app_identifier,
        }
    }
}

impl<R: tauri::Runtime> AnalyticsRuntime for TauriAnalyticsRuntime<R> {
    fn enrich(&self, payload: &mut AnalyticsPayload) {
        payload
            .props
            .entry("app_version".into())
            .or_insert(self.app_version.clone().into());

        payload
            .props
            .entry("app_identifier".into())
            .or_insert(self.app_identifier.clone().into());

        payload
            .props
            .entry("git_hash".into())
            .or_insert(self.git_hash.clone().into());

        payload
            .props
            .entry("bundle_id".into())
            .or_insert(self.bundle_id.clone().into());

        payload.props.entry("$set".into()).or_insert_with(|| {
            serde_json::json!({
                "app_version": self.app_version
            })
        });
    }

    fn distinct_id(&self) -> String {
        hypr_host::fingerprint()
    }

    fn is_disabled(&self) -> bool {
        let result: Result<bool, tauri_plugin_store2::Error> = (|| {
            let store = self.app_handle.store2().scoped_store(crate::PLUGIN_NAME)?;
            let v: bool = store.get(crate::StoreKey::Disabled)?.unwrap_or(false);
            Ok(v)
        })();
        result.unwrap_or(true)
    }

    fn set_disabled(&self, disabled: bool) -> Result<(), hypr_analytics::Error> {
        let store = self
            .app_handle
            .store2()
            .scoped_store(crate::PLUGIN_NAME)
            .map_err(|e| hypr_analytics::Error::Runtime(e.to_string()))?;
        store
            .set(crate::StoreKey::Disabled, disabled)
            .map_err(|e| hypr_analytics::Error::Runtime(e.to_string()))?;
        Ok(())
    }
}
