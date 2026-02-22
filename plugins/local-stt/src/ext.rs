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
#[cfg(target_arch = "aarch64")]
use crate::server::internal2;
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
            .map(|base| base.join("models").join("stt").into_std_path_buf())
            .unwrap_or_else(|_| {
                dirs::data_dir()
                    .unwrap_or_default()
                    .join("models")
                    .join("stt")
            })
    }

    pub fn cactus_models_dir(&self) -> PathBuf {
        use tauri_plugin_settings::SettingsPluginExt;
        self.manager
            .settings()
            .global_base()
            .map(|base| base.join("models").join("cactus").into_std_path_buf())
            .unwrap_or_else(|_| {
                dirs::data_dir()
                    .unwrap_or_default()
                    .join("models")
                    .join("cactus")
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
                Ok(self.models_dir().join(model.file_name()).exists())
            }
            SupportedSttModel::Cactus(m) => {
                #[cfg(target_arch = "aarch64")]
                {
                    let model_dir = self.cactus_models_dir().join(m.dir_name());
                    return Ok(model_dir.is_dir()
                        && std::fs::read_dir(&model_dir)
                            .map(|mut d| d.next().is_some())
                            .unwrap_or(false));
                }
                #[cfg(not(target_arch = "aarch64"))]
                {
                    let _ = m;
                    Err(crate::Error::UnsupportedModelType)
                }
            }
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn start_server(&self, model: SupportedSttModel) -> Result<String, crate::Error> {
        let server_type = match &model {
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) | SupportedSttModel::Cactus(_) => ServerType::Internal,
        };

        let current_info = match server_type {
            #[cfg(target_arch = "aarch64")]
            ServerType::Internal => internal2_health().await,
            #[cfg(not(target_arch = "aarch64"))]
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

        if matches!(server_type, ServerType::External) && !self.is_model_downloaded(&model).await? {
            return Err(crate::Error::ModelNotDownloaded);
        }

        let supervisor = self.get_supervisor().await?;

        supervisor::stop_all_stt_servers(&supervisor)
            .await
            .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;

        match server_type {
            ServerType::Internal => {
                #[cfg(target_arch = "aarch64")]
                {
                    use hypr_transcribe_cactus::CactusConfig;

                    let cache_dir = self.cactus_models_dir();
                    let cactus_model = match model {
                        SupportedSttModel::Cactus(m) => m,
                        _ => return Err(crate::Error::UnsupportedModelType),
                    };
                    start_internal2_server(
                        &supervisor,
                        cache_dir,
                        cactus_model,
                        CactusConfig::default(),
                    )
                    .await
                }
                #[cfg(not(target_arch = "aarch64"))]
                Err(crate::Error::UnsupportedModelType)
            }
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
    pub async fn get_server_for_model(
        &self,
        model: &SupportedSttModel,
    ) -> Result<Option<ServerInfo>, crate::Error> {
        let server_type = match model {
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) | SupportedSttModel::Cactus(_) => ServerType::Internal,
        };

        let info = match server_type {
            #[cfg(target_arch = "aarch64")]
            ServerType::Internal => internal2_health().await,
            #[cfg(not(target_arch = "aarch64"))]
            ServerType::Internal => None,
            ServerType::External => external_health().await,
        };

        Ok(info)
    }

    #[tracing::instrument(skip_all)]
    pub async fn get_servers(&self) -> Result<HashMap<ServerType, ServerInfo>, crate::Error> {
        #[cfg(target_arch = "aarch64")]
        let internal_info = internal2_health().await.unwrap_or(ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        });
        #[cfg(not(target_arch = "aarch64"))]
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
        let cancellation_token = CancellationToken::new();

        let make_progress_callback = {
            let app = app_handle.clone();
            move |model: SupportedSttModel| {
                let last_progress = std::sync::Arc::new(std::sync::Mutex::new(0i8));
                let app = app.clone();

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
            }
        };

        let task = match model.clone() {
            SupportedSttModel::Am(m) => {
                let tar_path = self.models_dir().join(format!("{}.tar", m.model_dir()));
                let final_path = self.models_dir();
                spawn_download_task(
                    m.tar_url().to_string(),
                    tar_path,
                    model.clone(),
                    state_for_cleanup,
                    make_progress_callback(model.clone()),
                    app_handle,
                    cancellation_token.clone(),
                    move |p| {
                        m.tar_verify_and_unpack(p, &final_path)
                            .map_err(|e| crate::Error::ModelUnpackFailed(e.to_string()))
                    },
                )
            }
            SupportedSttModel::Whisper(m) => {
                let model_path = self.models_dir().join(m.file_name());
                spawn_download_task(
                    m.model_url().to_string(),
                    model_path,
                    model.clone(),
                    state_for_cleanup,
                    make_progress_callback(model.clone()),
                    app_handle,
                    cancellation_token.clone(),
                    move |p| {
                        let checksum = hypr_file::calculate_file_checksum(p)
                            .map_err(|e| crate::Error::ModelUnpackFailed(e.to_string()))?;
                        if checksum != m.checksum() {
                            if let Err(e) = std::fs::remove_file(p) {
                                tracing::warn!(
                                    "failed to remove corrupted model file after checksum mismatch: {}",
                                    e
                                );
                            }
                            return Err(crate::Error::ModelUnpackFailed(
                                "checksum mismatch".to_string(),
                            ));
                        }
                        Ok(())
                    },
                )
            }
            SupportedSttModel::Cactus(m) => {
                let Some(url) = m.model_url() else {
                    return Err(crate::Error::UnsupportedModelType);
                };
                let cactus_dir = self.cactus_models_dir();
                let zip_path = cactus_dir.join(m.zip_name());
                let extract_dir = cactus_dir.join(m.dir_name());
                spawn_download_task(
                    url.to_string(),
                    zip_path,
                    model.clone(),
                    state_for_cleanup,
                    make_progress_callback(model.clone()),
                    app_handle,
                    cancellation_token.clone(),
                    move |p| {
                        extract_zip(p, &extract_dir)?;
                        let _ = std::fs::remove_file(p);
                        Ok(())
                    },
                )
            }
        };

        {
            let state = self.manager.state::<crate::SharedState>();
            let mut s = state.lock().await;
            s.download_task.insert(model, (task, cancellation_token));
        }

        Ok(())
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
                SupportedSttModel::Cactus(m) => {
                    let zip_path = self.cactus_models_dir().join(m.zip_name());
                    let _ = std::fs::remove_file(&zip_path);
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
            SupportedSttModel::Cactus(m) => {
                let model_dir = self.cactus_models_dir().join(m.dir_name());
                if model_dir.exists() {
                    std::fs::remove_dir_all(&model_dir)
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

#[cfg(target_arch = "aarch64")]
async fn start_internal2_server(
    supervisor: &supervisor::SupervisorRef,
    cache_dir: PathBuf,
    model: hypr_cactus_model::CactusSttModel,
    cactus_config: hypr_transcribe_cactus::CactusConfig,
) -> Result<String, crate::Error> {
    supervisor::start_internal2_stt(
        supervisor,
        internal2::Internal2STTArgs {
            model_cache_dir: cache_dir,
            model_type: model,
            cactus_config,
        },
    )
    .await
    .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

    internal2_health()
        .await
        .and_then(|info| info.url)
        .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
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

#[cfg(target_arch = "aarch64")]
async fn internal2_health() -> Option<ServerInfo> {
    match registry::where_is(internal2::Internal2STTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<internal2::Internal2STTMessage> = cell.into();
            call_t!(actor, internal2::Internal2STTMessage::GetHealth, 10 * 1000).ok()
        }
        None => None,
    }
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

fn spawn_download_task<R: Runtime>(
    url: String,
    dest_path: PathBuf,
    model: SupportedSttModel,
    state_for_cleanup: crate::SharedState,
    progress_callback: impl Fn(DownloadProgress) + Send + Sync + 'static,
    app_handle_for_error: tauri::AppHandle<R>,
    cancellation_token: CancellationToken,
    post_download: impl FnOnce(&std::path::Path) -> Result<(), crate::Error> + Send + 'static,
) -> tokio::task::JoinHandle<()> {
    let token_clone = cancellation_token.clone();
    let model_for_cleanup = model.clone();
    let model_for_error = model.clone();

    tokio::spawn(async move {
        let result = download_file_parallel_cancellable(
            &url,
            &dest_path,
            progress_callback,
            Some(token_clone),
        )
        .await;

        let cleanup = || async {
            let mut s = state_for_cleanup.lock().await;
            s.download_task.remove(&model_for_cleanup);
        };

        if let Err(e) = result {
            if !matches!(e, hypr_file::Error::Cancelled) {
                tracing::error!("model_download_error: {}", e);
                let _ = DownloadProgressPayload {
                    model: model_for_error.clone(),
                    progress: -1,
                }
                .emit(&app_handle_for_error);
            }
            cleanup().await;
            return;
        }

        if let Err(e) = post_download(&dest_path) {
            tracing::error!("model_post_download_error: {}", e);
            let _ = DownloadProgressPayload {
                model: model_for_error,
                progress: -1,
            }
            .emit(&app_handle_for_error);
            cleanup().await;
            return;
        }

        cleanup().await;
    })
}

fn extract_zip(
    zip_path: impl AsRef<std::path::Path>,
    output_dir: impl AsRef<std::path::Path>,
) -> Result<(), crate::Error> {
    let file = std::fs::File::open(zip_path.as_ref())
        .map_err(|e| crate::Error::ModelUnpackFailed(e.to_string()))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| crate::Error::ModelUnpackFailed(e.to_string()))?;

    std::fs::create_dir_all(output_dir.as_ref())
        .map_err(|e| crate::Error::ModelUnpackFailed(e.to_string()))?;

    archive
        .extract(output_dir.as_ref())
        .map_err(|e| crate::Error::ModelUnpackFailed(e.to_string()))?;

    Ok(())
}
