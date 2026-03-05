use std::io::{IsTerminal, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use clap::ValueEnum;
use hypr_listener2_core::{BatchErrorCode, BatchEvent, BatchParams, BatchProvider};
use indicatif::{ProgressBar, ProgressStyle};
use tokio::sync::mpsc;

use crate::commands::OutputFormat;
use crate::commands::cactus_server::resolve_and_spawn_cactus;
use crate::error::{CliError, CliResult};

mod runtime;

use runtime::BatchEventRuntime;

#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum Provider {
    Argmax,
    Deepgram,
    Soniox,
    Assemblyai,
    Fireworks,
    Openai,
    Gladia,
    Elevenlabs,
    Dashscope,
    Mistral,
    Am,
    Cactus,
}

impl From<Provider> for BatchProvider {
    fn from(value: Provider) -> Self {
        match value {
            Provider::Argmax => BatchProvider::Argmax,
            Provider::Deepgram => BatchProvider::Deepgram,
            Provider::Soniox => BatchProvider::Soniox,
            Provider::Assemblyai => BatchProvider::AssemblyAI,
            Provider::Fireworks => BatchProvider::Fireworks,
            Provider::Openai => BatchProvider::OpenAI,
            Provider::Gladia => BatchProvider::Gladia,
            Provider::Elevenlabs => BatchProvider::ElevenLabs,
            Provider::Dashscope => BatchProvider::DashScope,
            Provider::Mistral => BatchProvider::Mistral,
            Provider::Am => BatchProvider::Am,
            Provider::Cactus => BatchProvider::Cactus,
        }
    }
}

pub struct Args {
    pub input: PathBuf,
    pub provider: Provider,
    pub base_url: Option<String>,
    pub api_key: String,
    pub model: Option<String>,
    pub language: String,
    pub keywords: Vec<String>,
    pub output: Option<PathBuf>,
    pub format: OutputFormat,
    pub quiet: bool,
}

pub async fn run(args: Args) -> CliResult<()> {
    validate_input_path(&args.input)?;

    let languages = vec![
        args.language
            .parse::<hypr_language::Language>()
            .map_err(|e| {
                CliError::invalid_argument("--language", args.language.clone(), e.to_string())
            })?,
    ];

    let _server;
    let base_url = if matches!(args.provider, Provider::Cactus) {
        let (server, url) = resolve_and_spawn_cactus(args.model.as_deref()).await?;
        _server = Some(server);
        url
    } else {
        _server = None;
        args.base_url
            .ok_or_else(|| CliError::required_argument("--base-url (or CHAR_BASE_URL)"))?
    };

    let session_id = uuid::Uuid::new_v4().to_string();
    let (batch_tx, mut batch_rx) = mpsc::unbounded_channel::<BatchEvent>();
    let runtime = Arc::new(BatchEventRuntime { tx: batch_tx });

    let file_path = args.input.to_str().ok_or_else(|| {
        CliError::invalid_argument(
            "--input",
            args.input.display().to_string(),
            "path must be valid utf-8",
        )
    })?;

    let params = BatchParams {
        session_id,
        provider: args.provider.into(),
        file_path: file_path.to_string(),
        model: args.model,
        base_url,
        api_key: args.api_key,
        languages,
        keywords: args.keywords,
    };

    let quiet = args.quiet;
    let show_progress = !quiet && std::io::stderr().is_terminal();
    let format = args.format;
    let output = args.output;

    let progress = if show_progress {
        let bar = ProgressBar::new(100);
        bar.set_style(
            ProgressStyle::with_template("{spinner} {msg} [{bar:20}] {pos:>3}%")
                .unwrap()
                .progress_chars("█▓░"),
        );
        bar.set_message("Transcribing");
        bar.enable_steady_tick(std::time::Duration::from_millis(120));
        Some(bar)
    } else {
        None
    };

    let started = std::time::Instant::now();
    let batch_task =
        tokio::spawn(async move { hypr_listener2_core::run_batch(runtime, params).await });

    let mut last_progress_percent: i8 = -1;
    let mut response: Option<owhisper_interface::batch::Response> = None;
    let mut last_streamed: Option<owhisper_interface::stream::StreamResponse> = None;
    let mut failure: Option<(BatchErrorCode, String)> = None;

    while let Some(event) = batch_rx.recv().await {
        match event {
            BatchEvent::BatchStarted { .. } => {
                if let Some(progress) = &progress {
                    progress.set_position(0);
                }
            }
            BatchEvent::BatchCompleted { .. } => {
                if let Some(progress) = &progress {
                    progress.set_position(100);
                }
            }
            BatchEvent::BatchResponseStreamed {
                percentage,
                response: streamed,
                ..
            } => {
                last_streamed = Some(streamed);
                let Some(progress) = &progress else {
                    continue;
                };
                let percent = (percentage * 100.0).round().clamp(0.0, 100.0) as i8;
                if percent == last_progress_percent {
                    continue;
                }

                last_progress_percent = percent;
                progress.set_position(percent as u64);
            }
            BatchEvent::BatchResponse { response: next, .. } => {
                response = Some(next);
            }
            BatchEvent::BatchFailed { code, error, .. } => {
                failure = Some((code, error));
            }
        }
    }

    let result = batch_task
        .await
        .map_err(|e| CliError::external_action_failed("batch transcription", e.to_string()))?;
    if let Err(error) = result {
        if let Some(progress) = progress {
            progress.abandon_with_message("Failed");
        }
        let message = if let Some((code, message)) = failure {
            format!("{code:?}: {message}")
        } else {
            error.to_string()
        };
        return Err(CliError::operation_failed("batch transcription", message));
    }

    if let Some(progress) = progress {
        progress.set_position(100);
        progress.finish_and_clear();
    }

    let response = response
        .or_else(|| batch_response_from_stream(last_streamed))
        .ok_or_else(|| {
            CliError::operation_failed("batch transcription", "completed without a final response")
        })?;

    match format {
        OutputFormat::Json => {
            write_json_response(output.as_deref(), &response).await?;
        }
        OutputFormat::Text => {
            let transcript = extract_transcript(&response);
            write_text_response(output.as_deref(), transcript).await?;
        }
    }

    if !quiet {
        let elapsed = started.elapsed();
        let audio_duration = response
            .metadata
            .get("duration")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let mut parts = Vec::new();
        if audio_duration > 0.0 {
            parts.push(format!("{:.1}s audio", audio_duration));
        }
        parts.push(format!("in {:.1}s", elapsed.as_secs_f64()));
        if let Some(path) = &output {
            parts.push(format!("-> {}", path.display()));
        }
        eprintln!("\x1b[2m{}\x1b[0m", parts.join(", "));
    }

    Ok(())
}

fn batch_response_from_stream(
    last: Option<owhisper_interface::stream::StreamResponse>,
) -> Option<owhisper_interface::batch::Response> {
    use owhisper_interface::stream::StreamResponse;

    let StreamResponse::TranscriptResponse {
        channel, duration, ..
    } = last?
    else {
        return None;
    };

    Some(owhisper_interface::batch::Response {
        metadata: serde_json::json!({ "duration": duration }),
        results: owhisper_interface::batch::Results {
            channels: vec![channel.into()],
        },
    })
}

fn validate_input_path(path: &Path) -> CliResult<()> {
    if !path.exists() {
        return Err(CliError::not_found(
            format!("input file '{}'", path.display()),
            None,
        ));
    }

    if !path.is_file() {
        return Err(CliError::invalid_argument(
            "--input",
            path.display().to_string(),
            "expected a file path",
        ));
    }

    Ok(())
}

fn extract_transcript(response: &owhisper_interface::batch::Response) -> String {
    response
        .results
        .channels
        .iter()
        .filter_map(|c| c.alternatives.first())
        .map(|alt| alt.transcript.trim())
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

async fn write_text_response(output: Option<&Path>, transcript: String) -> CliResult<()> {
    if let Some(path) = output {
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                CliError::operation_failed("create output directory", e.to_string())
            })?;
        }

        tokio::fs::write(path, transcript + "\n")
            .await
            .map_err(|e| CliError::operation_failed("write output", e.to_string()))?;
        return Ok(());
    }

    println!("{transcript}");
    Ok(())
}

async fn write_json_response(
    output: Option<&Path>,
    response: &owhisper_interface::batch::Response,
) -> CliResult<()> {
    let bytes = if std::io::stdout().is_terminal() {
        serde_json::to_vec_pretty(response)
    } else {
        serde_json::to_vec(response)
    }
    .map_err(|e| CliError::operation_failed("serialize response", e.to_string()))?;

    if let Some(path) = output {
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                CliError::operation_failed("create output directory", e.to_string())
            })?;
        }

        tokio::fs::write(path, bytes)
            .await
            .map_err(|e| CliError::operation_failed("write output", e.to_string()))?;
        return Ok(());
    }

    std::io::stdout()
        .write_all(&bytes)
        .map_err(|e| CliError::operation_failed("write output", e.to_string()))?;
    std::io::stdout()
        .write_all(b"\n")
        .map_err(|e| CliError::operation_failed("write output", e.to_string()))?;
    Ok(())
}
