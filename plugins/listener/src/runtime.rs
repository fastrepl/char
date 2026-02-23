use hypr_listener_core::ListenerRuntime;
use tauri_plugin_settings::SettingsPluginExt;
use tauri_specta::Event;

pub struct TauriRuntime {
    pub app: tauri::AppHandle,
}

impl ListenerRuntime for TauriRuntime {
    fn sessions_dir(&self) -> Result<std::path::PathBuf, String> {
        self.app
            .settings()
            .cached_vault_base()
            .map(|base| base.join("sessions").into_std_path_buf())
            .map_err(|e| e.to_string())
    }

    fn emit_lifecycle(&self, event: hypr_listener_core::SessionLifecycleEvent) {
        use tauri_plugin_tray::TrayPluginExt;
        match &event {
            hypr_listener_core::SessionLifecycleEvent::Active { .. } => {
                let _ = self.app.tray().set_start_disabled(true);
            }
            hypr_listener_core::SessionLifecycleEvent::Inactive { .. } => {
                let _ = self.app.tray().set_start_disabled(false);
            }
            hypr_listener_core::SessionLifecycleEvent::Finalizing { .. } => {}
        }

        let plugin_event: crate::events::SessionLifecycleEvent = event.into();
        if let Err(error) = plugin_event.emit(&self.app) {
            tracing::error!(?error, "failed_to_emit_lifecycle_event");
        }
    }

    fn emit_progress(&self, event: hypr_listener_core::SessionProgressEvent) {
        let plugin_event: crate::events::SessionProgressEvent = event.into();
        if let Err(error) = plugin_event.emit(&self.app) {
            tracing::error!(?error, "failed_to_emit_progress_event");
        }
    }

    fn emit_error(&self, event: hypr_listener_core::SessionErrorEvent) {
        let plugin_event: crate::events::SessionErrorEvent = event.into();
        if let Err(error) = plugin_event.emit(&self.app) {
            tracing::error!(?error, "failed_to_emit_error_event");
        }
    }

    fn emit_data(&self, event: hypr_listener_core::SessionDataEvent) {
        let plugin_event: crate::events::SessionDataEvent = event.into();
        if let Err(error) = plugin_event.emit(&self.app) {
            tracing::error!(?error, "failed_to_emit_data_event");
        }
    }
}
