use std::sync::Arc;

use hypr_listener2_core as core;
use tauri_specta::Event;

pub struct Listener2<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Listener2<'a, R, M> {
    pub async fn run_batch(&self, params: core::BatchParams) -> Result<(), core::Error> {
        let app = self.manager.state::<crate::SharedState>().inner().clone();

        let runtime = Arc::new(Listener2Runtime {
            storage: tauri_plugin_settings::TauriStorageRuntime { app },
        });
        core::run_batch(runtime, params).await
    }

    pub async fn run_denoise(&self, params: core::DenoiseParams) -> Result<(), core::Error> {
        let app = self.manager.state::<crate::SharedState>().inner().clone();

        let runtime = Arc::new(Listener2Runtime {
            storage: tauri_plugin_settings::TauriStorageRuntime { app },
        });
        core::run_denoise(runtime, params).await
    }

    pub async fn confirm_denoise(&self, session_id: &str) -> Result<(), core::Error> {
        let app = self.manager.state::<crate::SharedState>().inner().clone();

        let runtime = Listener2Runtime {
            storage: tauri_plugin_settings::TauriStorageRuntime { app },
        };
        let session_id = session_id.to_string();

        tokio::task::spawn_blocking(move || {
            core::confirm_denoise(&runtime, &session_id).map(|_| ())
        })
        .await
        .map_err(|e| core::Error::DenoiseError(e.to_string()))?
    }

    pub async fn revert_denoise(&self, session_id: &str) -> Result<(), core::Error> {
        let app = self.manager.state::<crate::SharedState>().inner().clone();

        let runtime = Listener2Runtime {
            storage: tauri_plugin_settings::TauriStorageRuntime { app },
        };
        let session_id = session_id.to_string();

        tokio::task::spawn_blocking(move || core::revert_denoise(&runtime, &session_id))
            .await
            .map_err(|e| core::Error::DenoiseError(e.to_string()))?
    }

    pub fn parse_subtitle(&self, path: String) -> Result<core::Subtitle, String> {
        core::parse_subtitle_from_path(path)
    }

    pub fn export_to_vtt(
        &self,
        session_id: String,
        words: Vec<core::VttWord>,
    ) -> Result<String, String> {
        use tauri_plugin_settings::SettingsPluginExt;

        let base = self
            .manager
            .settings()
            .cached_vault_base()
            .map_err(|e| e.to_string())?;
        let session_dir = base.join("sessions").join(&session_id);

        std::fs::create_dir_all(&session_dir).map_err(|e| e.to_string())?;

        let vtt_path = session_dir.join("transcript.vtt");

        core::export_words_to_vtt_file(words, &vtt_path)?;
        Ok(vtt_path.to_string())
    }
}

pub trait Listener2PluginExt<R: tauri::Runtime> {
    fn listener2(&self) -> Listener2<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Listener2PluginExt<R> for T {
    fn listener2(&self) -> Listener2<'_, R, Self>
    where
        Self: Sized,
    {
        Listener2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

struct Listener2Runtime {
    storage: tauri_plugin_settings::TauriStorageRuntime,
}

impl hypr_storage::StorageRuntime for Listener2Runtime {
    fn global_base(&self) -> Result<std::path::PathBuf, hypr_storage::Error> {
        self.storage.global_base()
    }

    fn vault_base(&self) -> Result<std::path::PathBuf, hypr_storage::Error> {
        self.storage.vault_base()
    }
}

impl core::BatchRuntime for Listener2Runtime {
    fn emit(&self, event: core::BatchEvent) {
        let tauri_event: crate::BatchEvent = event.into();
        let _ = tauri_event.emit(&self.storage.app);
    }
}

impl core::DenoiseRuntime for Listener2Runtime {
    fn emit(&self, event: core::DenoiseEvent) {
        let tauri_event: crate::DenoiseEvent = event.into();
        let _ = tauri_event.emit(&self.storage.app);
    }
}
