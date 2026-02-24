use std::path::PathBuf;

use camino::Utf8PathBuf;

use hypr_storage::ObsidianVault;

pub struct Settings<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Settings<'a, R, M> {
    pub fn default_base(&self) -> Result<PathBuf, crate::Error> {
        let bundle_id: &str = self.manager.config().identifier.as_ref();
        let path = hypr_storage::global::compute_default_base(bundle_id)
            .ok_or(hypr_storage::Error::DataDirUnavailable)?;
        std::fs::create_dir_all(&path)?;
        Ok(path)
    }

    pub fn global_base(&self) -> Result<Utf8PathBuf, crate::Error> {
        let path = self.default_base()?;
        Utf8PathBuf::from_path_buf(path).map_err(|_| hypr_storage::Error::PathNotValidUtf8.into())
    }

    pub fn settings_path(&self) -> Result<Utf8PathBuf, crate::Error> {
        let base = self.cached_vault_base()?;
        Ok(base.join(hypr_storage::vault::SETTINGS_FILENAME))
    }

    pub fn cached_vault_base(&self) -> Result<Utf8PathBuf, crate::Error> {
        let state = self.manager.state::<crate::state::State>();
        Utf8PathBuf::from_path_buf(state.vault_base().clone())
            .map_err(|_| hypr_storage::Error::PathNotValidUtf8.into())
    }

    pub fn fresh_vault_base(&self) -> Result<PathBuf, crate::Error> {
        let default_base = self.default_base()?;
        let global_base = self.global_base()?;
        let custom_base = hypr_storage::vault::resolve_custom(global_base.as_ref(), &default_base);
        Ok(custom_base.unwrap_or(default_base))
    }

    pub fn obsidian_vaults(&self) -> Result<Vec<ObsidianVault>, crate::Error> {
        hypr_storage::obsidian::list_vaults().map_err(Into::into)
    }

    pub async fn load(&self) -> crate::Result<serde_json::Value> {
        let state = self.manager.state::<crate::state::State>();
        state.load().await
    }

    /// Returns the sync device ID, generating and persisting one if it doesn't exist yet.
    pub async fn sync_device_id(&self) -> crate::Result<uuid::Uuid> {
        let settings = self.load().await?;

        if let Some(id_str) = settings.get("sync_device_id").and_then(|v| v.as_str()) {
            if let Ok(id) = uuid::Uuid::parse_str(id_str) {
                return Ok(id);
            }
        }

        let id = uuid::Uuid::new_v4();
        self.save(serde_json::json!({ "sync_device_id": id.to_string() }))
            .await?;
        Ok(id)
    }

    pub async fn save(&self, settings: serde_json::Value) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::State>();
        state.save(settings).await
    }

    pub fn reset(&self) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::State>();
        state.reset()
    }
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R> + tauri::Emitter<R>> Settings<'a, R, M> {
    pub async fn change_vault_base(&self, new_path: Utf8PathBuf) -> Result<(), crate::Error> {
        let old_vault_base = self.cached_vault_base()?;
        let default_base = self.default_base()?;

        if new_path == old_vault_base {
            return Ok(());
        }

        hypr_storage::vault::validate_vault_base_change(
            old_vault_base.as_ref(),
            new_path.as_ref(),
        )?;
        hypr_storage::vault::ensure_vault_dir(new_path.as_ref())?;
        hypr_storage::vault::copy_vault_items(old_vault_base.as_ref(), new_path.as_ref()).await?;

        let vault_config_path = hypr_storage::global::compute_vault_config_path(&default_base);
        let mut config = std::fs::read_to_string(&vault_config_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| serde_json::json!({}));
        hypr_storage::vault::set_vault_path(&mut config, new_path.as_ref());

        hypr_storage::fs::atomic_write(
            &vault_config_path,
            &serde_json::to_string_pretty(&config)?,
        )?;

        Ok(())
    }
}

pub trait SettingsPluginExt<R: tauri::Runtime> {
    fn settings(&self) -> Settings<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> SettingsPluginExt<R> for T {
    fn settings(&self) -> Settings<'_, R, Self>
    where
        Self: Sized,
    {
        Settings {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
