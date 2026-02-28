use std::collections::HashMap;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;

use tokio::fs;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use hypr_download_interface::DownloadProgress;

use crate::Error;
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
    downloads: Arc<Mutex<HashMap<String, (JoinHandle<()>, CancellationToken)>>>,
}

impl<M: DownloadableModel> ModelDownloadManager<M> {
    pub fn new(runtime: Arc<dyn ModelDownloaderRuntime<M>>) -> Self {
        Self {
            runtime,
            downloads: Arc::new(Mutex::new(HashMap::new())),
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
            .map_err(|e| Error::DeleteFailed(e.to_string()))?
    }

    pub async fn is_downloading(&self, model: &M) -> bool {
        self.downloads
            .lock()
            .await
            .contains_key(&model.download_key())
    }

    pub async fn download(&self, model: &M) -> Result<(), Error> {
        let key = model.download_key();

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
            .download_url()
            .ok_or_else(|| Error::NoDownloadUrl(model.download_key()))?;

        let models_base = self.runtime.models_base()?;
        let destination = model.download_destination(&models_base);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).await?;
        }

        let cancellation_token = CancellationToken::new();
        let token_for_task = cancellation_token.clone();

        let runtime = self.runtime.clone();
        let downloads = self.downloads.clone();
        let model_clone = model.clone();
        let key_for_task = key.clone();
        let (start_tx, start_rx) = tokio::sync::oneshot::channel::<()>();

        let task = tokio::spawn(async move {
            let _ = start_rx.await;
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
                &destination,
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

            let destination_for_finalize = destination.clone();
            let model_for_finalize = model_clone.clone();
            let models_base_for_finalize = models_base.clone();
            let unpack_result = tokio::task::spawn_blocking(move || {
                model_for_finalize
                    .finalize_download(&destination_for_finalize, &models_base_for_finalize)
            })
            .await;

            match unpack_result {
                Ok(Ok(())) => {}
                Ok(Err(e)) => {
                    tracing::error!("model_unpack_error: {}", e);
                    runtime.emit_progress(&model_clone, -1);
                    cleanup().await;
                    return;
                }
                Err(e) => {
                    tracing::error!("model_unpack_join_error: {}", e);
                    runtime.emit_progress(&model_clone, -1);
                    cleanup().await;
                    return;
                }
            }

            if model_clone.remove_destination_after_finalize() {
                let _ = fs::remove_file(&destination).await;
            }
            cleanup().await;
        });

        {
            let mut downloads = self.downloads.lock().await;
            downloads.insert(key, (task, cancellation_token));
        }
        let _ = start_tx.send(());

        Ok(())
    }

    pub async fn cancel_download(&self, model: &M) -> Result<bool, Error> {
        let key = model.download_key();

        let existing = {
            let mut downloads = self.downloads.lock().await;
            downloads.remove(&key)
        };

        if let Some((task, token)) = existing {
            token.cancel();
            let _ = task.await;

            let models_base = self.runtime.models_base()?;
            if let Some(path) = model.cleanup_path_on_cancel(&models_base) {
                let _ = fs::remove_file(path).await;
            }

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
            .map_err(|e| Error::DeleteFailed(e.to_string()))?
    }
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    use super::{DownloadableModel, ModelDownloadManager};
    use crate::Error;
    use crate::runtime::ModelDownloaderRuntime;

    // --- test fixtures ---

    struct TestRuntime {
        temp_dir: Arc<tempfile::TempDir>,
        progress_log: Arc<Mutex<Vec<(String, i8)>>>,
    }

    impl TestRuntime {
        fn new() -> Arc<Self> {
            Arc::new(Self {
                temp_dir: Arc::new(tempfile::TempDir::new().unwrap()),
                progress_log: Arc::new(Mutex::new(Vec::new())),
            })
        }

        fn progress_values(&self) -> Vec<i8> {
            self.progress_log
                .lock()
                .unwrap()
                .iter()
                .map(|(_, p)| *p)
                .collect()
        }
    }

    impl ModelDownloaderRuntime<TestModel> for TestRuntime {
        fn models_base(&self) -> Result<PathBuf, Error> {
            Ok(self.temp_dir.path().to_path_buf())
        }

        fn emit_progress(&self, model: &TestModel, progress: i8) {
            self.progress_log
                .lock()
                .unwrap()
                .push((model.download_key(), progress));
        }
    }

    #[derive(Clone)]
    struct TestModel {
        key: String,
        url: Option<String>,
    }

    impl TestModel {
        fn with_url(key: &str, url: String) -> Self {
            Self {
                key: key.to_string(),
                url: Some(url),
            }
        }

        fn without_url(key: &str) -> Self {
            Self {
                key: key.to_string(),
                url: None,
            }
        }
    }

    impl DownloadableModel for TestModel {
        fn download_key(&self) -> String {
            self.key.clone()
        }

        fn download_url(&self) -> Option<String> {
            self.url.clone()
        }

        fn download_destination(&self, models_base: &Path) -> PathBuf {
            models_base.join(format!("{}.bin", self.key))
        }

        fn is_downloaded(&self, models_base: &Path) -> Result<bool, Error> {
            Ok(self.download_destination(models_base).exists())
        }

        fn finalize_download(
            &self,
            _downloaded_path: &Path,
            _models_base: &Path,
        ) -> Result<(), Error> {
            Ok(())
        }

        fn delete_downloaded(&self, models_base: &Path) -> Result<(), Error> {
            std::fs::remove_file(self.download_destination(models_base)).map_err(Error::Io)
        }
    }

    // --- helpers ---

    async fn start_mock_server(route: &str, body: Vec<u8>) -> MockServer {
        let server = MockServer::start().await;
        let len = body.len().to_string();

        Mock::given(method("HEAD"))
            .and(path(route))
            .respond_with(ResponseTemplate::new(200).insert_header("content-length", len.as_str()))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(route))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(body)
                    .insert_header("content-length", len.as_str()),
            )
            .mount(&server)
            .await;

        server
    }

    async fn wait_until_done(manager: &ModelDownloadManager<TestModel>, model: &TestModel) {
        tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                if !manager.is_downloading(model).await {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("download did not complete within 10s");
    }

    // --- tests ---

    #[tokio::test]
    async fn model_path_returns_correct_path() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("my_model");

        let result = manager.model_path(&model).unwrap();

        assert_eq!(result, runtime.temp_dir.path().join("my_model.bin"));
    }

    #[tokio::test]
    async fn is_downloaded_false_when_missing() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("absent");

        assert!(!manager.is_downloaded(&model).await.unwrap());
    }

    #[tokio::test]
    async fn is_downloaded_true_when_file_exists() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("present");

        std::fs::write(manager.model_path(&model).unwrap(), b"weights").unwrap();

        assert!(manager.is_downloaded(&model).await.unwrap());
    }

    #[tokio::test]
    async fn download_success() {
        let server = start_mock_server("/model.bin", b"fake weights".to_vec()).await;
        let url = format!("{}/model.bin", server.uri());

        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::with_url("success", url);

        manager.download(&model).await.unwrap();
        wait_until_done(&manager, &model).await;

        assert!(manager.is_downloaded(&model).await.unwrap());
        assert!(!manager.is_downloading(&model).await);

        let events = runtime.progress_values();
        assert!(events.contains(&0), "should emit 0 (started): {events:?}");
        assert!(
            events.contains(&100),
            "should emit 100 (finished): {events:?}"
        );
    }

    #[tokio::test]
    async fn download_no_url_returns_error() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("no_url");

        let result = manager.download(&model).await;

        assert!(matches!(result, Err(Error::NoDownloadUrl(_))));
    }

    #[tokio::test]
    async fn cancel_download_returns_false_when_idle() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("idle");

        let cancelled = manager.cancel_download(&model).await.unwrap();

        assert!(!cancelled);
    }

    #[tokio::test]
    async fn cancel_download_returns_true_and_cleans_up() {
        let server = MockServer::start().await;

        Mock::given(method("HEAD"))
            .and(path("/slow.bin"))
            .respond_with(ResponseTemplate::new(200).insert_header("content-length", "1024"))
            .mount(&server)
            .await;

        // Delay the GET response so the task is in-flight when we cancel.
        Mock::given(method("GET"))
            .and(path("/slow.bin"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(vec![0u8; 1024])
                    .set_delay(Duration::from_millis(500)),
            )
            .mount(&server)
            .await;

        let url = format!("{}/slow.bin", server.uri());
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::with_url("cancel_target", url);

        manager.download(&model).await.unwrap();

        // Let the task start and dispatch the HEAD request before we cancel.
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(manager.is_downloading(&model).await);

        let cancelled = manager.cancel_download(&model).await.unwrap();

        assert!(cancelled);
        assert!(!manager.is_downloading(&model).await);
        assert!(!manager.is_downloaded(&model).await.unwrap());
    }

    #[tokio::test]
    async fn delete_success() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("to_delete");

        std::fs::write(manager.model_path(&model).unwrap(), b"weights").unwrap();
        assert!(manager.is_downloaded(&model).await.unwrap());

        manager.delete(&model).await.unwrap();

        assert!(!manager.is_downloaded(&model).await.unwrap());
    }

    #[tokio::test]
    async fn delete_not_downloaded_returns_error() {
        let runtime = TestRuntime::new();
        let manager = ModelDownloadManager::new(runtime.clone());
        let model = TestModel::without_url("ghost");

        let result = manager.delete(&model).await;

        assert!(matches!(result, Err(Error::ModelNotDownloaded(_))));
    }
}
