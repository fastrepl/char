use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use clap::Subcommand;
use hypr_am::AmModel;
use hypr_cactus_model::{CactusModel, CactusSttModel};
use hypr_local_llm_core::SupportedModel;
use hypr_model_downloader::{DownloadableModel, ModelDownloadManager};
use hypr_whisper_local_model::WhisperModel;

mod runtime;

use runtime::CliModelRuntime;

#[derive(Subcommand, Debug)]
pub enum ModelCommands {
    List,
    Download { name: String },
    Delete { name: String },
}

#[derive(Clone, Debug)]
pub(super) enum CliModel {
    Whisper(WhisperModel),
    Am(AmModel),
    Cactus(CactusSttModel),
    Llm(SupportedModel),
}

impl CliModel {
    fn cli_name(&self) -> &'static str {
        match self {
            CliModel::Whisper(WhisperModel::QuantizedTiny) => "whisper-tiny",
            CliModel::Whisper(WhisperModel::QuantizedTinyEn) => "whisper-tiny-en",
            CliModel::Whisper(WhisperModel::QuantizedBase) => "whisper-base",
            CliModel::Whisper(WhisperModel::QuantizedBaseEn) => "whisper-base-en",
            CliModel::Whisper(WhisperModel::QuantizedSmall) => "whisper-small",
            CliModel::Whisper(WhisperModel::QuantizedSmallEn) => "whisper-small-en",
            CliModel::Whisper(WhisperModel::QuantizedLargeTurbo) => "whisper-large-turbo",
            CliModel::Am(AmModel::ParakeetV2) => "am-parakeet-v2",
            CliModel::Am(AmModel::ParakeetV3) => "am-parakeet-v3",
            CliModel::Am(AmModel::WhisperLargeV3) => "am-whisper-large-v3",
            CliModel::Cactus(model) => match model {
                CactusSttModel::WhisperSmallInt4 => "cactus-whisper-small-int4",
                CactusSttModel::WhisperSmallInt8 => "cactus-whisper-small-int8",
                CactusSttModel::WhisperSmallInt8Apple => "cactus-whisper-small-int8-apple",
                CactusSttModel::WhisperMediumInt4 => "cactus-whisper-medium-int4",
                CactusSttModel::WhisperMediumInt4Apple => "cactus-whisper-medium-int4-apple",
                CactusSttModel::WhisperMediumInt8 => "cactus-whisper-medium-int8",
                CactusSttModel::WhisperMediumInt8Apple => "cactus-whisper-medium-int8-apple",
                CactusSttModel::ParakeetCtc0_6bInt4 => "cactus-parakeet-ctc-0.6b-int4",
                CactusSttModel::ParakeetCtc0_6bInt8 => "cactus-parakeet-ctc-0.6b-int8",
            },
            CliModel::Llm(SupportedModel::Llama3p2_3bQ4) => "llm-llama3-2-3b-q4",
            CliModel::Llm(SupportedModel::HyprLLM) => "llm-hypr-llm",
            CliModel::Llm(SupportedModel::Gemma3_4bQ4) => "llm-gemma3-4b-q4",
        }
    }

    fn display_name(&self) -> String {
        match self {
            CliModel::Whisper(model) => model.display_name().to_string(),
            CliModel::Am(model) => model.display_name().to_string(),
            CliModel::Cactus(model) => model.display_name().to_string(),
            CliModel::Llm(SupportedModel::Llama3p2_3bQ4) => "Llama 3.2 3B Q4".to_string(),
            CliModel::Llm(SupportedModel::HyprLLM) => "HyprLLM".to_string(),
            CliModel::Llm(SupportedModel::Gemma3_4bQ4) => "Gemma 3 4B Q4".to_string(),
        }
    }

    fn kind(&self) -> &'static str {
        match self {
            CliModel::Whisper(_) => "stt-whisper",
            CliModel::Am(_) => "stt-am",
            CliModel::Cactus(_) => "stt-cactus",
            CliModel::Llm(_) => "llm",
        }
    }

    fn description(&self) -> String {
        match self {
            CliModel::Whisper(model) => model.description(),
            CliModel::Am(model) => model.description().to_string(),
            CliModel::Cactus(model) => model.description().to_string(),
            CliModel::Llm(model) => human_size(model.model_size()),
        }
    }

    fn install_path(&self, models_base: &Path) -> PathBuf {
        match self {
            CliModel::Whisper(model) => models_base.join("stt").join(model.file_name()),
            CliModel::Am(model) => models_base.join("stt").join(model.model_dir()),
            CliModel::Cactus(model) => models_base
                .join("cactus")
                .join(CactusModel::Stt(model.clone()).dir_name()),
            CliModel::Llm(model) => models_base.join("llm").join(model.file_name()),
        }
    }
}

impl DownloadableModel for CliModel {
    fn download_key(&self) -> String {
        match self {
            CliModel::Cactus(model) => {
                format!("cactus:{}", CactusModel::Stt(model.clone()).asset_id())
            }
            CliModel::Whisper(model) => format!("whisper:{}", model.file_name()),
            CliModel::Am(model) => format!("am:{}", model.model_dir()),
            CliModel::Llm(model) => format!("llm:{}", model.file_name()),
        }
    }

    fn download_url(&self) -> Option<String> {
        match self {
            CliModel::Cactus(model) => CactusModel::Stt(model.clone())
                .model_url()
                .map(ToString::to_string),
            CliModel::Whisper(model) => Some(model.model_url().to_string()),
            CliModel::Am(model) => Some(model.tar_url().to_string()),
            CliModel::Llm(model) => Some(model.model_url().to_string()),
        }
    }

    fn download_destination(&self, models_base: &Path) -> PathBuf {
        match self {
            CliModel::Cactus(model) => models_base
                .join("cactus")
                .join(CactusModel::Stt(model.clone()).zip_name()),
            CliModel::Whisper(model) => models_base.join("stt").join(model.file_name()),
            CliModel::Am(model) => models_base
                .join("stt")
                .join(format!("{}.tar", model.model_dir())),
            CliModel::Llm(model) => models_base.join("llm").join(model.file_name()),
        }
    }

    fn is_downloaded(&self, models_base: &Path) -> Result<bool, hypr_model_downloader::Error> {
        match self {
            CliModel::Cactus(model) => {
                let model_dir = models_base
                    .join("cactus")
                    .join(CactusModel::Stt(model.clone()).dir_name());
                Ok(model_dir.is_dir()
                    && std::fs::read_dir(&model_dir)
                        .map(|mut d| d.next().is_some())
                        .unwrap_or(false))
            }
            CliModel::Whisper(model) => {
                Ok(models_base.join("stt").join(model.file_name()).exists())
            }
            CliModel::Am(model) => model
                .is_downloaded(models_base.join("stt"))
                .map_err(|e| hypr_model_downloader::Error::OperationFailed(e.to_string())),
            CliModel::Llm(model) => {
                hypr_local_llm_core::is_model_downloaded(model, &models_base.join("llm"))
                    .map_err(|e| hypr_model_downloader::Error::OperationFailed(e.to_string()))
            }
        }
    }

    fn finalize_download(
        &self,
        downloaded_path: &Path,
        models_base: &Path,
    ) -> Result<(), hypr_model_downloader::Error> {
        match self {
            CliModel::Cactus(model) => {
                let output_dir = models_base
                    .join("cactus")
                    .join(CactusModel::Stt(model.clone()).dir_name());
                extract_zip(downloaded_path, output_dir)?;
                Ok(())
            }
            CliModel::Whisper(model) => {
                let checksum = hypr_file::calculate_file_checksum(downloaded_path)?;
                if checksum != model.checksum() {
                    let _ = std::fs::remove_file(downloaded_path);
                    return Err(hypr_model_downloader::Error::FinalizeFailed(
                        "checksum mismatch".to_string(),
                    ));
                }
                Ok(())
            }
            CliModel::Am(model) => {
                let final_path = models_base.join("stt");
                model
                    .tar_verify_and_unpack(downloaded_path, &final_path)
                    .map_err(|e| hypr_model_downloader::Error::FinalizeFailed(e.to_string()))
            }
            CliModel::Llm(_) => Ok(()),
        }
    }

    fn delete_downloaded(&self, models_base: &Path) -> Result<(), hypr_model_downloader::Error> {
        match self {
            CliModel::Cactus(model) => {
                let model_dir = models_base
                    .join("cactus")
                    .join(CactusModel::Stt(model.clone()).dir_name());
                if model_dir.exists() {
                    std::fs::remove_dir_all(&model_dir)
                        .map_err(|e| hypr_model_downloader::Error::DeleteFailed(e.to_string()))?;
                }
                Ok(())
            }
            CliModel::Whisper(model) => {
                let model_path = models_base.join("stt").join(model.file_name());
                if model_path.exists() {
                    std::fs::remove_file(&model_path)
                        .map_err(|e| hypr_model_downloader::Error::DeleteFailed(e.to_string()))?;
                }
                Ok(())
            }
            CliModel::Am(model) => {
                let model_dir = models_base.join("stt").join(model.model_dir());
                if model_dir.exists() {
                    std::fs::remove_dir_all(&model_dir)
                        .map_err(|e| hypr_model_downloader::Error::DeleteFailed(e.to_string()))?;
                }
                Ok(())
            }
            CliModel::Llm(model) => {
                let path = models_base.join("llm").join(model.file_name());
                if path.exists() {
                    std::fs::remove_file(&path)
                        .map_err(|e| hypr_model_downloader::Error::DeleteFailed(e.to_string()))?;
                }
                Ok(())
            }
        }
    }

    fn remove_destination_after_finalize(&self) -> bool {
        matches!(self, CliModel::Cactus(_) | CliModel::Am(_))
    }
}

pub async fn run(command: ModelCommands) {
    let models_base = default_models_base();
    let runtime = Arc::new(CliModelRuntime {
        models_base: models_base.clone(),
    });
    let manager = ModelDownloadManager::new(runtime);

    match command {
        ModelCommands::List => {
            println!("models_base={}", models_base.display());
            for model in all_models() {
                let status = match manager.is_downloaded(&model).await {
                    Ok(true) => "downloaded",
                    Ok(false) => {
                        if model.download_url().is_some() {
                            "not-downloaded"
                        } else {
                            "unavailable"
                        }
                    }
                    Err(_) => "error",
                };

                let description = model.description();
                if description.is_empty() {
                    println!(
                        "{}\t{}\t{}\t{}",
                        model.cli_name(),
                        model.kind(),
                        status,
                        model.display_name(),
                    );
                } else {
                    println!(
                        "{}\t{}\t{}\t{} ({})",
                        model.cli_name(),
                        model.kind(),
                        status,
                        model.display_name(),
                        description,
                    );
                }
            }
        }
        ModelCommands::Download { name } => {
            let Some(model) = find_model(&name) else {
                eprintln!("Unknown model: {name}");
                eprintln!("Run `char model list` to see available models.");
                std::process::exit(1);
            };

            if manager.is_downloaded(&model).await.unwrap_or(false) {
                println!(
                    "Model already downloaded: {} ({})",
                    model.display_name(),
                    model.install_path(&models_base).display()
                );
                return;
            }

            if let Err(e) = manager.download(&model).await {
                eprintln!("Failed to start download for {}: {e}", model.cli_name());
                std::process::exit(1);
            }

            while manager.is_downloading(&model).await {
                tokio::time::sleep(Duration::from_millis(120)).await;
            }

            if manager.is_downloaded(&model).await.unwrap_or(false) {
                println!(
                    "Downloaded {} -> {}",
                    model.display_name(),
                    model.install_path(&models_base).display()
                );
            } else {
                eprintln!("Download failed for {}", model.cli_name());
                std::process::exit(1);
            }
        }
        ModelCommands::Delete { name } => {
            let Some(model) = find_model(&name) else {
                eprintln!("Unknown model: {name}");
                eprintln!("Run `char model list` to see available models.");
                std::process::exit(1);
            };

            if let Err(e) = manager.delete(&model).await {
                eprintln!("Failed to delete {}: {e}", model.cli_name());
                std::process::exit(1);
            }

            println!("Deleted {}", model.display_name());
        }
    }
}

fn find_model(name: &str) -> Option<CliModel> {
    all_models()
        .into_iter()
        .find(|model| model.cli_name() == name)
}

fn default_models_base() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("char")
        .join("models")
}

fn all_models() -> Vec<CliModel> {
    let mut models = vec![
        CliModel::Whisper(WhisperModel::QuantizedTiny),
        CliModel::Whisper(WhisperModel::QuantizedTinyEn),
        CliModel::Whisper(WhisperModel::QuantizedBase),
        CliModel::Whisper(WhisperModel::QuantizedBaseEn),
        CliModel::Whisper(WhisperModel::QuantizedSmall),
        CliModel::Whisper(WhisperModel::QuantizedSmallEn),
        CliModel::Whisper(WhisperModel::QuantizedLargeTurbo),
        CliModel::Am(AmModel::ParakeetV2),
        CliModel::Am(AmModel::ParakeetV3),
        CliModel::Am(AmModel::WhisperLargeV3),
    ];

    models.extend(CactusSttModel::all().iter().cloned().map(CliModel::Cactus));
    models.extend(
        hypr_local_llm_core::SUPPORTED_MODELS
            .iter()
            .cloned()
            .map(CliModel::Llm),
    );
    models
}

fn human_size(bytes: u64) -> String {
    let mb = bytes as f64 / (1024.0 * 1024.0);
    if mb >= 1024.0 {
        format!("{:.1} GB", mb / 1024.0)
    } else {
        format!("{:.0} MB", mb)
    }
}

fn extract_zip(
    zip_path: impl AsRef<Path>,
    output_dir: impl AsRef<Path>,
) -> Result<(), hypr_model_downloader::Error> {
    let file = std::fs::File::open(zip_path.as_ref())?;
    let mut archive = zip::ZipArchive::new(file)?;
    std::fs::create_dir_all(output_dir.as_ref())?;
    archive.extract(output_dir.as_ref())?;
    Ok(())
}
