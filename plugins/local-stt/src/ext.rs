use std::{collections::HashMap, path::PathBuf};

use ractor::{ActorRef, call_t, registry};
use tauri_specta::Event;
use tokio_util::sync::CancellationToken;

use tauri::{Manager, Runtime};
use tauri_plugin_sidecar2::Sidecar2PluginExt;

use hypr_download_interface::DownloadProgress;
use hypr_file::download_file_parallel_cancellable;

#[cfg(feature = "whisper-cpp")]
use crate::server::internal;
use crate::{
    model::SupportedSttModel,
    server::{ServerInfo, ServerStatus, ServerType, external, supervisor},
    types::DownloadProgressPayload,
};

pub struct LocalStt<'a, R: Runtime, M: Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: Runtime, M: Manager<R>> LocalStt<'a, R, M> {
    pub fn models_dir(&self) -> PathBuf {
        use tauri_plugin_settings::SettingsPluginExt;
        self.manager
            .settings()
            .global_base()
            .map(|base| base.join("models").join("stt"))
            .unwrap_or_else(|_| {
                dirs::data_dir()
                    .unwrap_or_default()
                    .join("models")
                    .join("stt")
            })
    }

    pub async fn get_supervisor(&self) -> Result<supervisor::SupervisorRef, crate::Error> {
        let state = self.manager.state::<crate::SharedState>();
        let guard = state.lock().await;
        guard
            .stt_supervisor
            .clone()
            .ok_or(crate::Error::SupervisorNotFound)
    }

    pub async fn is_model_downloaded(
        &self,
        model: &SupportedSttModel,
    ) -> Result<bool, crate::Error> {
        match model {
            SupportedSttModel::Am(model) => Ok(model.is_downloaded(self.models_dir())?),
            SupportedSttModel::Whisper(model) => {
                let model_path = self.models_dir().join(model.file_name());

                {
                    let (path, expected) = (model_path, model.model_size_bytes());
                    if !path.exists() {
                        return Ok(false);
                    }

                    let actual = hypr_file::file_size(path)?;
                    if actual != expected {
                        return Ok(false);
                    }
                }

                Ok(true)
            }
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn start_server(&self, model: SupportedSttModel) -> Result<String, crate::Error> {
        let server_type = match &model {
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) => ServerType::Internal,
        };

        #[cfg(not(feature = "whisper-cpp"))]
        if matches!(server_type, ServerType::Internal) {
            return Err(crate::Error::UnsupportedModelType);
        }

        let current_info = match server_type {
            #[cfg(feature = "whisper-cpp")]
            ServerType::Internal => internal_health().await,
            #[cfg(not(feature = "whisper-cpp"))]
            ServerType::Internal => None,
            ServerType::External => external_health().await,
        };

        if let Some(info) = current_info.as_ref()
            && info.model.as_ref() == Some(&model)
        {
            if let Some(url) = info.url.clone() {
                return Ok(url);
            }

            return Err(crate::Error::ServerStartFailed(
                "missing_health_url".to_string(),
            ));
        }

        if matches!(server_type, ServerType::Internal) && !self.is_model_downloaded(&model).await? {
            return Err(crate::Error::ModelNotDownloaded);
        }

        let supervisor = self.get_supervisor().await?;

        supervisor::stop_all_stt_servers(&supervisor)
            .await
            .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;

        match server_type {
            #[cfg(feature = "whisper-cpp")]
            ServerType::Internal => {
                let cache_dir = self.models_dir();
                let whisper_model = match model {
                    SupportedSttModel::Whisper(m) => m,
                    _ => return Err(crate::Error::UnsupportedModelType),
                };

                start_internal_server(&supervisor, cache_dir, whisper_model).await
            }
            #[cfg(not(feature = "whisper-cpp"))]
            ServerType::Internal => Err(crate::Error::UnsupportedModelType),
            ServerType::External => {
                let data_dir = self.models_dir();
                let am_model = match model {
                    SupportedSttModel::Am(m) => m,
                    _ => return Err(crate::Error::UnsupportedModelType),
                };

                start_external_server(self.manager, &supervisor, data_dir, am_model).await
            }
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn stop_server(&self, server_type: Option<ServerType>) -> Result<bool, crate::Error> {
        let supervisor = self.get_supervisor().await?;

        match server_type {
            Some(t) => {
                supervisor::stop_stt_server(&supervisor, t)
                    .await
                    .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;
                Ok(true)
            }
            None => {
                supervisor::stop_all_stt_servers(&supervisor)
                    .await
                    .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;
                Ok(true)
            }
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn get_servers(&self) -> Result<HashMap<ServerType, ServerInfo>, crate::Error> {
        #[cfg(feature = "whisper-cpp")]
        let internal_info = internal_health().await.unwrap_or(ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        });
        #[cfg(not(feature = "whisper-cpp"))]
        let internal_info = ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        };

        let external_info = external_health().await.unwrap_or(ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        });

        Ok([
            (ServerType::Internal, internal_info),
            (ServerType::External, external_info),
        ]
        .into_iter()
        .collect())
    }

    #[tracing::instrument(skip_all)]
    pub async fn download_model(&self, model: SupportedSttModel) -> Result<(), crate::Error> {
        {
            let existing = {
                let state = self.manager.state::<crate::SharedState>();
                let mut s = state.lock().await;
                s.download_task.remove(&model)
            };

            if let Some((existing_task, existing_token)) = existing {
                existing_token.cancel();
                let _ = existing_task.await;
            }
        }

        let state_for_cleanup = self.manager.state::<crate::SharedState>().inner().clone();
        let app_handle = self.manager.app_handle().clone();
        let create_progress_callback = move |model: SupportedSttModel| {
            let last_progress = std::sync::Arc::new(std::sync::Mutex::new(0i8));
            let app = app_handle.clone();

            move |progress: DownloadProgress| {
                let mut last = last_progress.lock().unwrap();

                match progress {
                    DownloadProgress::Started => {
                        *last = 0;
                        let _ = DownloadProgressPayload {
                            model: model.clone(),
                            progress: 0,
                        }
                        .emit(&app);
                    }
                    DownloadProgress::Progress(downloaded, total_size) => {
                        let percent = (downloaded as f64 / total_size as f64) * 100.0;
                        let current = percent as i8;

                        if current > *last {
                            *last = current;
                            let _ = DownloadProgressPayload {
                                model: model.clone(),
                                progress: current,
                            }
                            .emit(&app);
                        }
                    }
                    DownloadProgress::Finished => {
                        *last = 100;
                        let _ = DownloadProgressPayload {
                            model: model.clone(),
                            progress: 100,
                        }
                        .emit(&app);
                    }
                }
            }
        };

        let app_handle_for_error = self.manager.app_handle().clone();
        match model.clone() {
            SupportedSttModel::Am(m) => {
                let tar_path = self.models_dir().join(format!("{}.tar", m.model_dir()));
                let final_path = self.models_dir();
                let cancellation_token = CancellationToken::new();
                let token_clone = cancellation_token.clone();
                let model_for_task = model.clone();
                let state_clone = state_for_cleanup.clone();
                let model_for_cleanup = model.clone();

                let task = tokio::spawn(async move {
                    let callback = create_progress_callback(model_for_task.clone());

                    let result = download_file_parallel_cancellable(
                        m.tar_url(),
                        &tar_path,
                        callback,
                        Some(token_clone),
                    )
                    .await;

                    let cleanup = || async {
                        let mut s = state_clone.lock().await;
                        s.download_task.remove(&model_for_cleanup);
                    };

                    if let Err(e) = result {
                        if !matches!(e, hypr_file::Error::Cancelled) {
                            tracing::error!("model_download_error: {}", e);
                            let _ = DownloadProgressPayload {
                                model: model_for_task.clone(),
                                progress: -1,
                            }
                            .emit(&app_handle_for_error);
                        }
                        cleanup().await;
                        return;
                    }

                    if let Err(e) = m.tar_verify_and_unpack(&tar_path, &final_path) {
                        tracing::error!("model_unpack_error: {}", e);
                        let _ = DownloadProgressPayload {
                            model: model_for_task.clone(),
                            progress: -1,
                        }
                        .emit(&app_handle_for_error);
                        cleanup().await;
                        return;
                    }

                    cleanup().await;
                });

                {
                    let state = self.manager.state::<crate::SharedState>();
                    let mut s = state.lock().await;
                    s.download_task
                        .insert(model.clone(), (task, cancellation_token));
                }

                Ok(())
            }
            SupportedSttModel::Whisper(m) => {
                let model_path = self.models_dir().join(m.file_name());
                let cancellation_token = CancellationToken::new();
                let token_clone = cancellation_token.clone();
                let model_for_task = model.clone();
                let state_clone = state_for_cleanup.clone();
                let model_for_cleanup = model.clone();

                let task = tokio::spawn(async move {
                    let callback = create_progress_callback(model_for_task.clone());

                    let result = download_file_parallel_cancellable(
                        m.model_url(),
                        &model_path,
                        callback,
                        Some(token_clone),
                    )
                    .await;

                    let cleanup = || async {
                        let mut s = state_clone.lock().await;
                        s.download_task.remove(&model_for_cleanup);
                    };

                    if let Err(e) = result {
                        if !matches!(e, hypr_file::Error::Cancelled) {
                            tracing::error!("model_download_error: {}", e);
                            let _ = DownloadProgressPayload {
                                model: model_for_task.clone(),
                                progress: -1,
                            }
                            .emit(&app_handle_for_error);
                        }
                        cleanup().await;
                        return;
                    }

                    let checksum = match hypr_file::calculate_file_checksum(&model_path) {
                        Ok(c) => c,
                        Err(e) => {
                            tracing::error!("model_checksum_error: {}", e);
                            let _ = DownloadProgressPayload {
                                model: model_for_task.clone(),
                                progress: -1,
                            }
                            .emit(&app_handle_for_error);
                            cleanup().await;
                            return;
                        }
                    };

                    if checksum != m.checksum() {
                        tracing::error!("model_download_error: checksum mismatch");
                        if let Err(e) = std::fs::remove_file(&model_path) {
                            tracing::warn!(
                                "failed to remove corrupted model file after checksum mismatch: {}",
                                e
                            );
                        }
                        let _ = DownloadProgressPayload {
                            model: model_for_task.clone(),
                            progress: -1,
                        }
                        .emit(&app_handle_for_error);
                        cleanup().await;
                        return;
                    }

                    cleanup().await;
                });

                {
                    let state = self.manager.state::<crate::SharedState>();
                    let mut s = state.lock().await;
                    s.download_task
                        .insert(model.clone(), (task, cancellation_token));
                }

                Ok(())
            }
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn cancel_download(&self, model: SupportedSttModel) -> bool {
        let existing = {
            let state = self.manager.state::<crate::SharedState>();
            let mut s = state.lock().await;
            s.download_task.remove(&model)
        };

        if let Some((task, token)) = existing {
            token.cancel();
            let _ = task.await;

            match &model {
                SupportedSttModel::Am(m) => {
                    let tar_path = self.models_dir().join(format!("{}.tar", m.model_dir()));
                    let _ = std::fs::remove_file(&tar_path);
                }
                SupportedSttModel::Whisper(m) => {
                    let model_path = self.models_dir().join(m.file_name());
                    let _ = std::fs::remove_file(&model_path);
                }
            }

            let _ = DownloadProgressPayload {
                model,
                progress: 100,
            }
            .emit(self.manager.app_handle());

            true
        } else {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn is_model_downloading(&self, model: &SupportedSttModel) -> bool {
        let state = self.manager.state::<crate::SharedState>();
        {
            let guard = state.lock().await;
            guard.download_task.contains_key(model)
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn delete_model(&self, model: &SupportedSttModel) -> Result<(), crate::Error> {
        if !self.is_model_downloaded(model).await? {
            return Err(crate::Error::ModelNotDownloaded);
        }

        match model {
            SupportedSttModel::Am(m) => {
                let model_dir = self.models_dir().join(m.model_dir());
                if model_dir.exists() {
                    std::fs::remove_dir_all(&model_dir)
                        .map_err(|e| crate::Error::ModelDeleteFailed(e.to_string()))?;
                }
            }
            SupportedSttModel::Whisper(m) => {
                let model_path = self.models_dir().join(m.file_name());
                if model_path.exists() {
                    std::fs::remove_file(&model_path)
                        .map_err(|e| crate::Error::ModelDeleteFailed(e.to_string()))?;
                }
            }
        }

        Ok(())
    }
}

pub trait LocalSttPluginExt<R: Runtime> {
    fn local_stt(&self) -> LocalStt<'_, R, Self>
    where
        Self: Manager<R> + Sized;
}

impl<R: Runtime, T: Manager<R>> LocalSttPluginExt<R> for T {
    fn local_stt(&self) -> LocalStt<'_, R, Self>
    where
        Self: Sized,
    {
        LocalStt {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

#[cfg(feature = "whisper-cpp")]
async fn start_internal_server(
    supervisor: &supervisor::SupervisorRef,
    cache_dir: PathBuf,
    model: hypr_whisper_local_model::WhisperModel,
) -> Result<String, crate::Error> {
    supervisor::start_internal_stt(
        supervisor,
        internal::InternalSTTArgs {
            model_cache_dir: cache_dir,
            model_type: model,
        },
    )
    .await
    .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

    internal_health()
        .await
        .and_then(|info| info.url)
        .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
}

async fn start_external_server<R: Runtime, T: Manager<R>>(
    manager: &T,
    supervisor: &supervisor::SupervisorRef,
    data_dir: PathBuf,
    model: hypr_am::AmModel,
) -> Result<String, crate::Error> {
    let am_key = {
        let state = manager.state::<crate::SharedState>();
        let key = {
            let guard = state.lock().await;
            guard.am_api_key.clone()
        };

        key.filter(|k| !k.is_empty())
            .ok_or(crate::Error::AmApiKeyNotSet)?
    };

    let port = port_check::free_local_port()
        .ok_or_else(|| crate::Error::ServerStartFailed("failed_to_find_free_port".to_string()))?;

    let app_handle = manager.app_handle().clone();
    let cmd_builder = external::CommandBuilder::new(move || {
        let mut cmd = app_handle
            .sidecar2()
            .sidecar("hyprnote-sidecar-stt")?
            .args(["serve", "--any-token"]);

        #[cfg(debug_assertions)]
        {
            cmd = cmd.args(["-v", "-d"]);
        }

        Ok(cmd)
    });

    supervisor::start_external_stt(
        supervisor,
        external::ExternalSTTArgs::new(cmd_builder, am_key, model, data_dir, port),
    )
    .await
    .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

    external_health()
        .await
        .and_then(|info| info.url)
        .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
}

#[cfg(feature = "whisper-cpp")]
async fn internal_health() -> Option<ServerInfo> {
    match registry::where_is(internal::InternalSTTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<internal::InternalSTTMessage> = cell.into();
            call_t!(actor, internal::InternalSTTMessage::GetHealth, 10 * 1000).ok()
        }
        None => None,
    }
}

async fn external_health() -> Option<ServerInfo> {
    match registry::where_is(external::ExternalSTTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<external::ExternalSTTMessage> = cell.into();
            call_t!(actor, external::ExternalSTTMessage::GetHealth, 10 * 1000).ok()
        }
        None => None,
    }
}
