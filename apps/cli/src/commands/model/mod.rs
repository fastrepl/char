use std::sync::Arc;
use std::time::Duration;

use clap::{Subcommand, ValueEnum};
use hypr_local_model::{LocalModel, LocalModelKind};
use hypr_model_downloader::{DownloadableModel, ModelDownloadManager};

mod runtime;
mod settings;

use runtime::CliModelRuntime;

#[derive(Subcommand, Debug)]
pub enum ModelCommands {
    Paths,
    Current,
    List {
        #[arg(long, value_enum)]
        kind: Option<ModelKind>,
    },
    Download {
        name: String,
    },
    Delete {
        name: String,
    },
}

#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum ModelKind {
    Stt,
    Llm,
}

pub async fn run(command: ModelCommands) {
    let paths = settings::resolve_paths();
    let models_base = paths.models_base.clone();

    match command {
        ModelCommands::Paths => {
            println!("global_base={}", paths.global_base.display());
            println!("vault_base={}", paths.vault_base.display());
            println!("settings_path={}", paths.settings_path.display());
            println!("models_base={}", models_base.display());
        }
        ModelCommands::Current => {
            println!("settings_path={}", paths.settings_path.display());

            let Some(current) = settings::load_settings(&paths.settings_path) else {
                println!("stt\tprovider=unset\tmodel=unset\tconfig=unavailable");
                println!("llm\tprovider=unset\tmodel=unset\tconfig=unavailable");
                return;
            };

            let stt_provider = current.current_stt_provider.as_deref().unwrap_or("unset");
            let stt_model = current.current_stt_model.as_deref().unwrap_or("unset");
            let llm_provider = current.current_llm_provider.as_deref().unwrap_or("unset");
            let llm_model = current.current_llm_model.as_deref().unwrap_or("unset");

            let stt_config = current
                .current_stt_provider
                .as_deref()
                .and_then(|id| current.stt_providers.get(id));
            let llm_config = current
                .current_llm_provider
                .as_deref()
                .and_then(|id| current.llm_providers.get(id));

            println!(
                "stt\tprovider={}\tmodel={}\t{}",
                stt_provider,
                stt_model,
                format_provider_config_status(stt_config)
            );
            println!(
                "llm\tprovider={}\tmodel={}\t{}",
                llm_provider,
                llm_model,
                format_provider_config_status(llm_config)
            );
        }
        ModelCommands::List { kind } => {
            let runtime = Arc::new(CliModelRuntime {
                models_base: models_base.clone(),
            });
            let manager = ModelDownloadManager::new(runtime);
            let current = settings::load_settings(&paths.settings_path);

            println!("models_base={}", models_base.display());
            for model in all_models(kind) {
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

                let active = if current
                    .as_ref()
                    .is_some_and(|value| is_current_model(&model, value))
                {
                    "*"
                } else {
                    ""
                };

                let description = model.description();
                if description.is_empty() {
                    println!(
                        "{}\t{}\t{}\t{}\t{}",
                        active,
                        model.cli_name(),
                        model.kind(),
                        status,
                        model.display_name(),
                    );
                } else {
                    println!(
                        "{}\t{}\t{}\t{}\t{} ({})",
                        active,
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
            let runtime = Arc::new(CliModelRuntime {
                models_base: models_base.clone(),
            });
            let manager = ModelDownloadManager::new(runtime);

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
            let runtime = Arc::new(CliModelRuntime {
                models_base: models_base.clone(),
            });
            let manager = ModelDownloadManager::new(runtime);

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

fn find_model(name: &str) -> Option<LocalModel> {
    all_models(None)
        .into_iter()
        .find(|model| model.cli_name() == name)
}

fn all_models(kind: Option<ModelKind>) -> Vec<LocalModel> {
    LocalModel::all()
        .into_iter()
        .filter(|model| matches_kind(model, kind))
        .collect()
}

fn matches_kind(model: &LocalModel, kind: Option<ModelKind>) -> bool {
    match kind {
        None => true,
        Some(ModelKind::Stt) => model.model_kind() == LocalModelKind::Stt,
        Some(ModelKind::Llm) => model.model_kind() == LocalModelKind::Llm,
    }
}

fn format_provider_config_status(config: Option<&settings::ProviderConfig>) -> String {
    let Some(config) = config else {
        return "config=missing".to_string();
    };

    let base_url = if config.base_url.is_some() {
        "set"
    } else {
        "missing"
    };
    let api_key = if config.has_api_key { "set" } else { "missing" };

    format!("config=base_url:{} api_key:{}", base_url, api_key)
}

fn is_current_model(model: &LocalModel, current: &settings::DesktopSettings) -> bool {
    match model.model_kind() {
        LocalModelKind::Llm => {
            current.current_llm_model.as_deref() == model.settings_name().as_deref()
        }
        LocalModelKind::Stt => {
            current.current_stt_provider.as_deref() == Some("hyprnote")
                && current.current_stt_model.as_deref() != Some("cloud")
                && current.current_stt_model.as_deref() == model.settings_name().as_deref()
        }
    }
}

trait SettingsName {
    fn settings_name(&self) -> Option<String>;
}

impl SettingsName for LocalModel {
    fn settings_name(&self) -> Option<String> {
        serde_json::to_value(self)
            .ok()?
            .as_str()
            .map(ToString::to_string)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    fn empty_settings() -> settings::DesktopSettings {
        settings::DesktopSettings {
            current_stt_provider: None,
            current_stt_model: None,
            current_llm_provider: None,
            current_llm_model: None,
            stt_providers: HashMap::new(),
            llm_providers: HashMap::new(),
        }
    }

    #[test]
    fn stt_current_model_uses_serialized_name() {
        let model = LocalModel::Whisper(hypr_local_model::WhisperModel::QuantizedTiny);
        let mut current = empty_settings();
        current.current_stt_provider = Some("hyprnote".to_string());
        current.current_stt_model = Some("QuantizedTiny".to_string());

        assert!(is_current_model(&model, &current));
    }

    #[test]
    fn llm_current_model_uses_serialized_name() {
        let model = LocalModel::GgufLlm(hypr_local_model::GgufLlmModel::Llama3p2_3bQ4);
        let mut current = empty_settings();
        current.current_llm_model = Some("Llama3p2_3bQ4".to_string());

        assert!(is_current_model(&model, &current));
    }
}
