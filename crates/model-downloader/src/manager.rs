use std::ffi::OsString;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use tokio::fs;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use crate::Error;
use crate::download_task::{DownloadTaskParams, spawn_download_task};
use crate::downloads_registry::{DownloadEntry, DownloadsRegistry};
use crate::runtime::ModelDownloaderRuntime;

pub trait DownloadableModel: Clone + Send + Sync + 'static {
    fn download_key(&self) -> String;
    fn download_url(&self) -> Option<String>;
    fn download_destination(&self, models_base: &Path) -> PathBuf;
    fn is_downloaded(&self, models_base: &Path) -> Result<bool, Error>;
    fn finalize_download(&self, downloaded_path: &Path, models_base: &Path) -> Result<(), Error>;
    fn delete_downloaded(&self, models_base: &Path) -> Result<(), Error>;

    fn cleanup_path_on_cancel(&self, models_base: &Path) -> Option<PathBuf> {
        Some(self.download_destination(models_base))
    }

    fn remove_destination_after_finalize(&self) -> bool {
        false
    }
}

pub struct ModelDownloadManager<M: DownloadableModel> {
    runtime: Arc<dyn ModelDownloaderRuntime<M>>,
    downloads: DownloadsRegistry,
    next_generation: Arc<AtomicU64>,
}

impl<M: DownloadableModel> Clone for ModelDownloadManager<M> {
    fn clone(&self) -> Self {
        Self {
            runtime: self.runtime.clone(),
            downloads: self.downloads.clone(),
            next_generation: self.next_generation.clone(),
        }
    }
}

impl<M: DownloadableModel> ModelDownloadManager<M> {
    const TASK_JOIN_WARN_AFTER: Duration = Duration::from_secs(5);

    pub fn new(runtime: Arc<dyn ModelDownloaderRuntime<M>>) -> Self {
        Self {
            runtime,
            downloads: DownloadsRegistry::new(),
            next_generation: Arc::new(AtomicU64::new(1)),
        }
    }

    pub fn model_path(&self, model: &M) -> Result<PathBuf, Error> {
        let models_base = self.runtime.models_base()?;
        Ok(model.download_destination(&models_base))
    }

    pub async fn is_downloaded(&self, model: &M) -> Result<bool, Error> {
        let models_base = self.runtime.models_base()?;
        let model_clone = model.clone();
        tokio::task::spawn_blocking(move || model_clone.is_downloaded(&models_base))
            .await
            .map_err(|e| Error::OperationFailed(e.to_string()))?
    }

    pub async fn is_downloading(&self, model: &M) -> bool {
        self.downloads.contains(&model.download_key()).await
    }

    async fn wait_for_task_exit(task: JoinHandle<()>, context: &'static str) {
        let warn_after = tokio::time::sleep(Self::TASK_JOIN_WARN_AFTER);
        tokio::pin!(warn_after);
        tokio::pin!(task);

        let join_result = tokio::select! {
            result = &mut task => result,
            _ = &mut warn_after => {
                tracing::warn!(
                    %context,
                    timeout_secs = Self::TASK_JOIN_WARN_AFTER.as_secs(),
                    "model_download_task_join_slow"
                );
                task.await
            }
        };

        match join_result {
            Ok(()) => {}
            Err(e) => {
                tracing::warn!(%context, error = %e, "model_download_task_join_failed");
            }
        }
    }

    pub async fn download(&self, model: &M) -> Result<(), Error> {
        let key = model.download_key();
        let generation = self.next_generation.fetch_add(1, Ordering::Relaxed);

        let url = model
            .download_url()
            .ok_or_else(|| Error::NoDownloadUrl(model.download_key()))?;

        let models_base = self.runtime.models_base()?;
        let final_destination = model.download_destination(&models_base);
        let destination = generation_download_path(&final_destination, generation);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).await?;
        }

        let (start_tx, start_rx) = tokio::sync::oneshot::channel::<()>();

        let cancellation_token = CancellationToken::new();
        let task = spawn_download_task(
            DownloadTaskParams {
                runtime: self.runtime.clone(),
                registry: self.downloads.clone(),
                model: model.clone(),
                url,
                destination: destination.clone(),
                final_destination: final_destination.clone(),
                models_base: models_base.clone(),
                key: key.clone(),
                generation,
                cancellation_token: cancellation_token.clone(),
            },
            start_rx,
        );

        let existing = self
            .downloads
            .insert(
                key,
                DownloadEntry {
                    task,
                    token: cancellation_token,
                    generation,
                    download_path: destination,
                },
            )
            .await;

        if let Some(entry) = existing {
            entry.token.cancel();
            Self::wait_for_task_exit(entry.task, "replace_existing_download").await;
        }

        let _ = start_tx.send(());

        Ok(())
    }

    pub async fn cancel_download(&self, model: &M) -> Result<bool, Error> {
        let key = model.download_key();

        let existing = self.downloads.remove(&key).await;

        if let Some(entry) = existing {
            entry.token.cancel();
            Self::wait_for_task_exit(entry.task, "cancel_download").await;
            let _ = fs::remove_file(entry.download_path).await;

            self.runtime.emit_progress(model, -1);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn delete(&self, model: &M) -> Result<(), Error> {
        if !self.is_downloaded(model).await? {
            return Err(Error::ModelNotDownloaded(model.download_key()));
        }

        let models_base = self.runtime.models_base()?;
        let model_clone = model.clone();
        tokio::task::spawn_blocking(move || model_clone.delete_downloaded(&models_base))
            .await
            .map_err(|e| Error::OperationFailed(e.to_string()))?
    }
}
fn generation_download_path(destination: &Path, generation: u64) -> PathBuf {
    let mut path = destination.to_path_buf();
    let suffix = format!(".part-{generation}");

    if let Some(file_name) = destination.file_name() {
        let mut generated_name = OsString::from(file_name);
        generated_name.push(suffix);
        path.set_file_name(generated_name);
    } else {
        path.push(format!("download{suffix}"));
    }

    path
}
