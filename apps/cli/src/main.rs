mod app;
mod commands;
mod event;
mod frame;
mod runtime;
mod theme;
mod ui;

use clap::{Parser, Subcommand};

use crate::commands::model::ModelCommands;

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

fn required_base_url(base_url: Option<String>) -> String {
    base_url.unwrap_or_else(|| {
        eprintln!("error: --base-url (or CHAR_BASE_URL) is required");
        std::process::exit(1);
    })
}

#[derive(Subcommand)]
enum Commands {
    Listen,
    Auth,
    Update {
        #[arg(long, env = "CHAR_UPDATE_ENDPOINT")]
        endpoint: Option<String>,
        #[arg(long, env = "CHAR_UPDATE_PUBKEY")]
        pubkey: Option<String>,
        #[arg(long, env = "CHAR_UPDATE_TARGET")]
        target: Option<String>,
        #[arg(long)]
        check_only: bool,
        #[arg(long)]
        allow_downgrade: bool,
    },
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

    match cli.command {
        Some(Commands::Auth) => commands::auth::run(),
        Some(Commands::Listen) => {
            let base_url = required_base_url(cli.base_url);

            commands::tui::run(commands::tui::Args {
                base_url,
                api_key: cli.api_key,
                model: cli.model,
                language: cli.language,
                record: cli.record,
            })
            .await;
        }
        Some(Commands::Update {
            endpoint,
            pubkey,
            target,
            check_only,
            allow_downgrade,
        }) => {
            commands::update::run(commands::update::Args {
                endpoint,
                pubkey,
                target,
                check_only,
                allow_downgrade,
            })
            .await;
        }
        Some(Commands::Batch { file, provider }) => {
            let base_url = required_base_url(cli.base_url);

            let provider = provider.parse().unwrap_or_else(|_| {
                eprintln!("error: unknown provider '{provider}'. expected: deepgram, soniox, assemblyai, am, cactus");
                std::process::exit(1);
            });

            commands::batch::run(commands::batch::Args {
                file,
                provider,
                base_url,
                api_key: cli.api_key,
                model: if cli.model.is_empty() {
                    None
                } else {
                    Some(cli.model)
                },
                language: cli.language,
                keywords: vec![],
            })
            .await;
        }
        Some(Commands::Model { command }) => {
            commands::model::run(command).await;
        }
        None => {
            let base_url = required_base_url(cli.base_url);

            commands::tui::run(commands::tui::Args {
                base_url,
                api_key: cli.api_key,
                model: cli.model,
                language: cli.language,
                record: cli.record,
            })
            .await;
        }
    }
}
