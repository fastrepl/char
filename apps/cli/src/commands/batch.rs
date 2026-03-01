use std::sync::Arc;

use hypr_listener2_core::{BatchEvent, BatchParams, BatchProvider, BatchRuntime};

use crate::error::{CliError, CliResult};

pub struct Args {
    pub file: String,
    pub provider: BatchProvider,
    pub base_url: String,
    pub api_key: String,
    pub model: Option<String>,
    pub language: String,
    pub keywords: Vec<String>,
}

struct CliBatchRuntime;

impl BatchRuntime for CliBatchRuntime {
    fn emit(&self, event: BatchEvent) {
        match &event {
            BatchEvent::BatchStarted { .. } => {
                eprintln!("Transcribing...");
            }
            BatchEvent::BatchResponseStreamed { percentage, .. } => {
                eprintln!("Progress: {:.0}%", percentage * 100.0);
            }
            BatchEvent::BatchResponse { response, .. } => {
                for channel in &response.results.channels {
                    for alt in &channel.alternatives {
                        if !alt.transcript.is_empty() {
                            println!("{}", alt.transcript);
                        }
                    }
                }
            }
            BatchEvent::BatchFailed { error, .. } => {
                eprintln!("Error: {error}");
            }
        }
    }
}

pub async fn run(args: Args) -> CliResult<()> {
    let languages = vec![
        args.language
            .parse::<hypr_language::Language>()
            .map_err(|e| {
                CliError::invalid_argument("--language", args.language.clone(), e.to_string())
            })?,
    ];

    let session_id = uuid::Uuid::new_v4().to_string();
    let runtime = Arc::new(CliBatchRuntime);

    let params = BatchParams {
        session_id,
        provider: args.provider,
        file_path: args.file,
        model: args.model,
        base_url: args.base_url,
        api_key: args.api_key,
        languages,
        keywords: args.keywords,
    };

    hypr_listener2_core::run_batch(runtime, params)
        .await
        .map_err(|e| CliError::operation_failed("batch transcription", e.to_string()))?;

    Ok(())
}
