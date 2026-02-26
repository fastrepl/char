use std::{future::Future, path::PathBuf};

use tauri::{Manager, Runtime, ipc::Channel};
use tauri_plugin_store2::Store2PluginExt;

use hypr_download_interface::DownloadProgress;
use hypr_file::download_file_parallel;

use crate::store::TauriModelStore;

pub trait LocalLlmPluginExt<R: Runtime> {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn models_dir(&self) -> PathBuf;

    fn list_downloaded_model(
        &self,
    ) -> impl Future<Output = Result<Vec<crate::SupportedModel>, crate::Error>>;

    fn list_custom_models(
        &self,
    ) -> impl Future<Output = Result<Vec<crate::CustomModelInfo>, crate::Error>>;
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error>;
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error>;
    fn get_current_model_selection(&self) -> Result<crate::ModelSelection, crate::Error>;
    fn set_current_model_selection(&self, model: crate::ModelSelection)
    -> Result<(), crate::Error>;

    fn download_model(
        &self,
        model: crate::SupportedModel,
        channel: Channel<i8>,
    ) -> impl Future<Output = Result<(), crate::Error>>;
    fn is_model_downloading(&self, model: &crate::SupportedModel) -> impl Future<Output = bool>;
    fn is_model_downloaded(
        &self,
        model: &crate::SupportedModel,
    ) -> impl Future<Output = Result<bool, crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalLlmPluginExt<R> for T {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.store2().scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn models_dir(&self) -> PathBuf {
        use tauri_plugin_settings::SettingsPluginExt;
        self.settings()
            .global_base()
            .map(|base| base.join("models").join("llm").into_std_path_buf())
            .unwrap_or_else(|_| dirs::data_dir().unwrap().join("models").join("llm"))
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloading(&self, model: &crate::SupportedModel) -> bool {
        let state = self.state::<crate::SharedState>();

        {
            let guard = state.lock().await;
            guard.download_task.contains_key(model)
        }
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloaded(
        &self,
        model: &crate::SupportedModel,
    ) -> Result<bool, crate::Error> {
        Ok(hypr_local_llm_core::is_model_downloaded(
            model,
            &self.models_dir(),
        )?)
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(
        &self,
        model: crate::SupportedModel,
        channel: Channel<i8>,
    ) -> Result<(), crate::Error> {
        let m = model.clone();
        let path = self.models_dir().join(m.file_name());

        {
            let existing = {
                let state = self.state::<crate::SharedState>();
                let mut s = state.lock().await;
                s.download_task.remove(&model)
            };

            if let Some(existing_task) = existing {
                existing_task.abort();
                let _ = existing_task.await;
            }
        }

        let task = tokio::spawn(async move {
            let last_progress = std::sync::Arc::new(std::sync::Mutex::new(0i8));

            let callback = |progress: DownloadProgress| {
                let mut last = last_progress.lock().unwrap();

                match progress {
                    DownloadProgress::Started => {
                        *last = 0;
                        let _ = channel.send(0);
                    }
                    DownloadProgress::Progress(downloaded, total_size) => {
                        let percent = (downloaded as f64 / total_size as f64) * 100.0;
                        let current = percent as i8;

                        if current > *last {
                            *last = current;
                            let _ = channel.send(current);
                        }
                    }
                    DownloadProgress::Finished => {
                        *last = 100;
                        let _ = channel.send(100);
                    }
                }
            };

            if let Err(e) = download_file_parallel(m.model_url(), path, callback).await {
                tracing::error!("model_download_error: {}", e);
                let _ = channel.send(-1);
            }
        });

        {
            let state = self.state::<crate::SharedState>();
            let mut s = state.lock().await;
            s.download_task.insert(model.clone(), task);
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn list_downloaded_model(&self) -> Result<Vec<crate::SupportedModel>, crate::Error> {
        Ok(hypr_local_llm_core::list_downloaded_models(
            &self.models_dir(),
        )?)
    }

    #[tracing::instrument(skip_all)]
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error> {
        let store = self.local_llm_store();
        let tauri_store = TauriModelStore::new(&store);
        Ok(hypr_local_llm_core::get_current_model(
            &tauri_store,
            &self.models_dir(),
        )?)
    }

    #[tracing::instrument(skip_all)]
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error> {
        let store = self.local_llm_store();
        let tauri_store = TauriModelStore::new(&store);
        Ok(hypr_local_llm_core::set_current_model(&tauri_store, model)?)
    }

    #[tracing::instrument(skip_all)]
    async fn list_custom_models(&self) -> Result<Vec<crate::CustomModelInfo>, crate::Error> {
        Ok(hypr_local_llm_core::list_custom_models()?)
    }

    #[tracing::instrument(skip_all)]
    fn get_current_model_selection(&self) -> Result<crate::ModelSelection, crate::Error> {
        let store = self.local_llm_store();
        let tauri_store = TauriModelStore::new(&store);
        Ok(hypr_local_llm_core::get_current_model_selection(
            &tauri_store,
            &self.models_dir(),
        )?)
    }

    #[tracing::instrument(skip_all)]
    fn set_current_model_selection(
        &self,
        model: crate::ModelSelection,
    ) -> Result<(), crate::Error> {
        let store = self.local_llm_store();
        let tauri_store = TauriModelStore::new(&store);
        Ok(hypr_local_llm_core::set_current_model_selection(
            &tauri_store,
            model,
        )?)
    }
}
