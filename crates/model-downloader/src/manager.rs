use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use hypr_cactus_model::CactusModel;
use hypr_download_interface::DownloadProgress;

use crate::Error;
use crate::runtime::ModelDownloaderRuntime;

pub struct ModelDownloadManager {
    runtime: Arc<dyn ModelDownloaderRuntime>,
    downloads: Arc<Mutex<HashMap<String, (JoinHandle<()>, CancellationToken)>>>,
}

impl ModelDownloadManager {
    pub fn new(runtime: Arc<dyn ModelDownloaderRuntime>) -> Self {
        Self {
            runtime,
            downloads: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn model_dir(&self, model: &CactusModel) -> Result<PathBuf, Error> {
        Ok(self.runtime.models_base()?.join(model.dir_name()))
    }

    pub fn model_path(&self, model: &CactusModel) -> Result<PathBuf, Error> {
        self.model_dir(model)
    }

    pub async fn is_downloaded(&self, model: &CactusModel) -> Result<bool, Error> {
        let model_dir = self.model_dir(model)?;
        Ok(model_dir.is_dir()
            && std::fs::read_dir(&model_dir)
                .map(|mut d| d.next().is_some())
                .unwrap_or(false))
    }

    pub async fn is_downloading(&self, model: &CactusModel) -> bool {
        self.downloads.lock().await.contains_key(model.asset_id())
    }

    pub async fn download(&self, model: &CactusModel) -> Result<(), Error> {
        let key = model.asset_id().to_string();

        {
            let existing = {
                let mut downloads = self.downloads.lock().await;
                downloads.remove(&key)
            };

            if let Some((task, token)) = existing {
                token.cancel();
                let _ = task.await;
            }
        }

        let url = model
            .model_url()
            .ok_or_else(|| Error::NoDownloadUrl(model.asset_id().to_string()))?;

        let models_base = self.runtime.models_base()?;
        let zip_path = models_base.join(model.zip_name());
        let extract_dir = models_base.join(model.dir_name());

        let cancellation_token = CancellationToken::new();
        let token_for_task = cancellation_token.clone();

        let runtime = self.runtime.clone();
        let downloads = self.downloads.clone();
        let model_clone = model.clone();
        let key_for_task = key.clone();
        let url = url.to_string();

        let task = tokio::spawn(async move {
            let last_progress = std::sync::Arc::new(std::sync::Mutex::new(0i8));

            let progress_model = model_clone.clone();
            let progress_runtime = runtime.clone();
            let progress_callback = move |progress: DownloadProgress| {
                let mut last = last_progress.lock().unwrap();

                match progress {
                    DownloadProgress::Started => {
                        *last = 0;
                        progress_runtime.emit_progress(&progress_model, 0);
                    }
                    DownloadProgress::Progress(downloaded, total_size) => {
                        let percent = (downloaded as f64 / total_size as f64) * 100.0;
                        let current = percent as i8;

                        if current > *last {
                            *last = current;
                            progress_runtime.emit_progress(&progress_model, current);
                        }
                    }
                    DownloadProgress::Finished => {
                        *last = 100;
                        progress_runtime.emit_progress(&progress_model, 100);
                    }
                }
            };

            let result = hypr_file::download_file_parallel_cancellable(
                &url,
                &zip_path,
                progress_callback,
                Some(token_for_task),
            )
            .await;

            let cleanup = || async {
                let mut d = downloads.lock().await;
                d.remove(&key_for_task);
            };

            if let Err(e) = result {
                if !matches!(e, hypr_file::Error::Cancelled) {
                    tracing::error!("model_download_error: {}", e);
                    runtime.emit_progress(&model_clone, -1);
                }
                cleanup().await;
                return;
            }

            if let Err(e) = extract_zip(&zip_path, &extract_dir) {
                tracing::error!("model_unpack_error: {}", e);
                runtime.emit_progress(&model_clone, -1);
                cleanup().await;
                return;
            }

            let _ = std::fs::remove_file(&zip_path);
            cleanup().await;
        });

        {
            let mut downloads = self.downloads.lock().await;
            downloads.insert(key, (task, cancellation_token));
        }

        Ok(())
    }

    pub async fn cancel_download(&self, model: &CactusModel) -> Result<bool, Error> {
        let key = model.asset_id().to_string();

        let existing = {
            let mut downloads = self.downloads.lock().await;
            downloads.remove(&key)
        };

        if let Some((task, token)) = existing {
            token.cancel();
            let _ = task.await;

            let models_base = self.runtime.models_base()?;
            let zip_path = models_base.join(model.zip_name());
            let _ = std::fs::remove_file(&zip_path);

            self.runtime.emit_progress(model, 100);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn delete(&self, model: &CactusModel) -> Result<(), Error> {
        if !self.is_downloaded(model).await? {
            return Err(Error::ModelNotDownloaded(model.asset_id().to_string()));
        }

        let model_dir = self.model_dir(model)?;
        if model_dir.exists() {
            std::fs::remove_dir_all(&model_dir).map_err(|e| Error::DeleteFailed(e.to_string()))?;
        }

        Ok(())
    }
}

fn extract_zip(
    zip_path: impl AsRef<std::path::Path>,
    output_dir: impl AsRef<std::path::Path>,
) -> Result<(), Error> {
    let file =
        std::fs::File::open(zip_path.as_ref()).map_err(|e| Error::UnpackFailed(e.to_string()))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| Error::UnpackFailed(e.to_string()))?;

    std::fs::create_dir_all(output_dir.as_ref()).map_err(|e| Error::UnpackFailed(e.to_string()))?;

    archive
        .extract(output_dir.as_ref())
        .map_err(|e| Error::UnpackFailed(e.to_string()))?;

    Ok(())
}
