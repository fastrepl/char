use std::path::PathBuf;

pub struct TauriStorageRuntime {
    pub app: tauri::AppHandle,
}

impl hypr_storage::StorageRuntime for TauriStorageRuntime {
    fn global_base(&self) -> Result<PathBuf, hypr_storage::Error> {
        use crate::SettingsPluginExt;
        self.app
            .settings()
            .global_base()
            .map(|p| p.into_std_path_buf())
            .map_err(|_| hypr_storage::Error::DataDirUnavailable)
    }

    fn vault_base(&self) -> Result<PathBuf, hypr_storage::Error> {
        use crate::SettingsPluginExt;
        self.app
            .settings()
            .cached_vault_base()
            .map(|p| p.into_std_path_buf())
            .map_err(|_| hypr_storage::Error::DataDirUnavailable)
    }
}
