mod app;
mod audio_drop;
mod commands;
mod entry;
mod entry_ui;
mod error;
mod event;
mod frame;
mod runtime;
mod terminal;
mod textarea_input;
mod theme;
mod ui;

use clap::{Parser, Subcommand};

use crate::commands::model::ModelCommands;
use crate::error::{CliError, CliResult};

#[derive(Parser)]
#[command(name = "char", about = "char")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    #[arg(long, env = "CHAR_BASE_URL", value_parser = parse_base_url)]
    base_url: Option<String>,

    #[arg(long, env = "CHAR_API_KEY", default_value = "")]
    api_key: String,

    #[arg(long, env = "CHAR_MODEL", default_value = "")]
    model: String,

    #[arg(long, env = "CHAR_LANGUAGE", default_value = "en")]
    language: String,

    #[arg(long, env = "CHAR_RECORD")]
    record: bool,
}

fn parse_base_url(value: &str) -> Result<String, String> {
    let parsed =
        url::Url::parse(value).map_err(|e| format!("invalid --base-url '{value}': {e}"))?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(format!(
            "invalid --base-url '{value}': scheme must be http or https"
        ));
    }

    Ok(value.to_string())
}

fn required_base_url(base_url: Option<String>) -> CliResult<String> {
    base_url.ok_or_else(|| CliError::required_argument("--base-url (or CHAR_BASE_URL)"))
}

#[derive(Subcommand)]
enum Commands {
    Listen,
    Auth,
    Desktop,
    Batch {
        #[arg(long)]
        file: String,
        #[arg(long)]
        provider: String,
    },
    Model {
        #[command(subcommand)]
        command: ModelCommands,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    if let Err(error) = run(cli).await {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}

async fn run(cli: Cli) -> CliResult<()> {
    let Cli {
        command,
        base_url,
        api_key,
        model,
        language,
        record,
    } = cli;

    match command {
        Some(Commands::Auth) => commands::auth::run(),
        Some(Commands::Desktop) => commands::desktop::run().map(|_| ()),
        Some(Commands::Listen) => {
            let base_url = required_base_url(base_url)?;

            commands::tui::run(commands::tui::Args {
                base_url,
                api_key,
                model,
                language,
                record,
            })
            .await
            .map(|_| ())
        }
        Some(Commands::Batch { file, provider }) => {
            let base_url = required_base_url(base_url)?;

            let provider = provider.parse().map_err(|_| {
                CliError::invalid_argument(
                    "--provider",
                    provider.clone(),
                    "expected one of: deepgram, soniox, assemblyai, am, cactus",
                )
            })?;

            commands::batch::run(commands::batch::Args {
                file,
                provider,
                base_url,
                api_key,
                model: if model.is_empty() { None } else { Some(model) },
                language,
                keywords: vec![],
            })
            .await
        }
        Some(Commands::Model { command }) => commands::model::run(command).await,
        None => match commands::entry::run(commands::entry::Args {
            status_message: None,
        })
        .await
        {
            entry::EntryAction::Listen => {
                let base_url = required_base_url(base_url)?;

                commands::tui::run(commands::tui::Args {
                    base_url,
                    api_key,
                    model,
                    language,
                    record,
                })
                .await
                .map(|_| ())
            }
            entry::EntryAction::Quit => Ok(()),
        },
    }
}
