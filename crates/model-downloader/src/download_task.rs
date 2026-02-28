use std::path::PathBuf;
use std::sync::{
    Arc,
    atomic::{AtomicI8, Ordering},
};

use tokio::fs;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use hypr_download_interface::DownloadProgress;

use crate::downloads_registry::DownloadsRegistry;
use crate::manager::DownloadableModel;
use crate::runtime::ModelDownloaderRuntime;

pub(crate) struct DownloadTaskParams<M: DownloadableModel> {
    pub(crate) runtime: Arc<dyn ModelDownloaderRuntime<M>>,
    pub(crate) registry: DownloadsRegistry,
    pub(crate) model: M,
    pub(crate) url: String,
    pub(crate) destination: PathBuf,
    pub(crate) final_destination: PathBuf,
    pub(crate) models_base: PathBuf,
    pub(crate) key: String,
    pub(crate) generation: u64,
    pub(crate) cancellation_token: CancellationToken,
}

pub(crate) fn spawn_download_task<M: DownloadableModel>(
    params: DownloadTaskParams<M>,
    start_rx: oneshot::Receiver<()>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let _ = start_rx.await;

        let progress_callback =
            make_progress_callback(params.runtime.clone(), params.model.clone());

        let download_result = hypr_file::download_file_parallel_cancellable(
            &params.url,
            &params.destination,
            progress_callback,
            Some(params.cancellation_token),
        )
        .await;

        if let Err(e) = download_result {
            if !matches!(e, hypr_file::Error::Cancelled) {
                tracing::error!(error = %e, "model_download_error");
                params.runtime.emit_progress(&params.model, -1);
            }
            params
                .registry
                .remove_if_generation_matches(&params.key, params.generation)
                .await;
            return;
        }

        let destination_for_finalize = params.destination.clone();
        let model_for_finalize = params.model.clone();
        let models_base_for_finalize = params.models_base.clone();
        let finalize_result = tokio::task::spawn_blocking(move || {
            model_for_finalize
                .finalize_download(&destination_for_finalize, &models_base_for_finalize)
        })
        .await;

        match finalize_result {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                tracing::error!(error = %e, "model_finalize_error");
                params.runtime.emit_progress(&params.model, -1);
                params
                    .registry
                    .remove_if_generation_matches(&params.key, params.generation)
                    .await;
                return;
            }
            Err(e) => {
                tracing::error!(error = %e, "model_finalize_join_error");
                params.runtime.emit_progress(&params.model, -1);
                params
                    .registry
                    .remove_if_generation_matches(&params.key, params.generation)
                    .await;
                return;
            }
        }

        if params.model.remove_destination_after_finalize() {
            let _ = fs::remove_file(&params.destination).await;
        } else {
            let promote_result =
                match fs::rename(&params.destination, &params.final_destination).await {
                    Ok(()) => Ok(()),
                    Err(_) => {
                        let _ = fs::remove_file(&params.final_destination).await;
                        fs::rename(&params.destination, &params.final_destination).await
                    }
                };

            if let Err(e) = promote_result {
                tracing::error!(error = %e, "model_download_promote_error");
                params.runtime.emit_progress(&params.model, -1);
                params
                    .registry
                    .remove_if_generation_matches(&params.key, params.generation)
                    .await;
                return;
            }
        }

        params
            .registry
            .remove_if_generation_matches(&params.key, params.generation)
            .await;
    })
}

fn make_progress_callback<M: DownloadableModel>(
    runtime: Arc<dyn ModelDownloaderRuntime<M>>,
    model: M,
) -> impl Fn(DownloadProgress) + Send + Sync {
    let last = Arc::new(AtomicI8::new(-1));

    move |progress: DownloadProgress| match progress {
        DownloadProgress::Started => {
            last.store(0, Ordering::Relaxed);
            runtime.emit_progress(&model, 0);
        }
        DownloadProgress::Progress(downloaded, total_size) => {
            if total_size == 0 {
                return;
            }

            let percent = (downloaded as f64 / total_size as f64) * 100.0;
            let current = (percent.clamp(0.0, 100.0) as i16) as i8;

            let mut prev = last.load(Ordering::Relaxed);
            while current > prev {
                match last.compare_exchange_weak(
                    prev,
                    current,
                    Ordering::Relaxed,
                    Ordering::Relaxed,
                ) {
                    Ok(_) => {
                        runtime.emit_progress(&model, current);
                        break;
                    }
                    Err(p) => prev = p,
                }
            }
        }
        DownloadProgress::Finished => {
            last.store(100, Ordering::Relaxed);
            runtime.emit_progress(&model, 100);
        }
    }
}
