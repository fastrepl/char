use std::time::Duration;

use restate_sdk::context::RunRetryPolicy;
use restate_sdk::prelude::*;
use restate_sdk::serde::Json;
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::deepgram;
use crate::soniox;
use crate::supabase;
pub use hypr_restate_stt_types::{PipelineStatus, SttStatusResponse};

fn default_provider() -> String {
    "soniox".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SttFileInput {
    pub user_id: String,
    pub file_id: String,
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default)]
    pub provider_options: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SttFileOutput {
    pub status: PipelineStatus,
    pub provider: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    pub raw_result: serde_json::Value,
}

#[restate_sdk::workflow]
pub trait SttFile {
    async fn run(input: Json<SttFileInput>) -> Result<Json<SttFileOutput>, HandlerError>;

    #[shared]
    #[name = "onTranscript"]
    async fn on_transcript(payload: Json<serde_json::Value>) -> Result<(), HandlerError>;

    #[shared]
    #[name = "getStatus"]
    async fn get_status() -> Result<Json<SttStatusResponse>, HandlerError>;
}

pub struct SttFileImpl {
    config: &'static Config,
    client: reqwest::Client,
}

impl SttFileImpl {
    pub fn new(config: &'static Config) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    async fn run_inner(
        &self,
        ctx: &WorkflowContext<'_>,
        input: &SttFileInput,
    ) -> Result<SttFileOutput, HandlerError> {
        if input.file_id.is_empty() {
            return Err(TerminalError::new("file_id cannot be empty").into());
        }
        if input.user_id.is_empty() {
            return Err(TerminalError::new("user_id cannot be empty").into());
        }

        let provider = input.provider.as_str();
        match provider {
            "soniox" | "deepgram" => {}
            other => {
                return Err(TerminalError::new(format!("unsupported provider: {other}")).into());
            }
        }

        ctx.set("status", Json(PipelineStatus::Queued));
        ctx.set("fileId", Json(input.file_id.clone()));
        ctx.set("provider", Json(input.provider.clone()));

        ctx.set("status", Json(PipelineStatus::Transcribing));

        let config = self.config;
        let client = self.client.clone();
        let file_id = input.file_id.clone();
        let audio_url: String = ctx
            .run(|| async move {
                supabase::create_signed_url(&client, config, &file_id, 3600)
                    .await
                    .map_err(|e| {
                        TerminalError::new(format!("Failed to create signed URL: {e}")).into()
                    })
            })
            .name("create-signed-url")
            .await?;

        let ingress_url = self.config.restate_ingress_url.trim_end_matches('/');
        let key = ctx.key();
        let encoded_key = urlencoding::encode(key);
        let callback_url = format!("{ingress_url}/SttFile/{encoded_key}/onTranscript");

        let retry_policy = RunRetryPolicy::default()
            .initial_delay(Duration::from_millis(500))
            .exponentiation_factor(2.0)
            .max_delay(Duration::from_secs(30))
            .max_attempts(5);

        match provider {
            "soniox" => {
                self.run_soniox(ctx, &audio_url, &callback_url, input, &retry_policy)
                    .await
            }
            "deepgram" => {
                self.run_deepgram(ctx, &audio_url, &callback_url, input, &retry_policy)
                    .await
            }
            _ => unreachable!(),
        }
    }

    async fn run_soniox(
        &self,
        ctx: &WorkflowContext<'_>,
        audio_url: &str,
        callback_url: &str,
        input: &SttFileInput,
        retry_policy: &RunRetryPolicy,
    ) -> Result<SttFileOutput, HandlerError> {
        let client = self.client.clone();
        let api_key = self.config.soniox_api_key.clone();
        let audio_url = audio_url.to_string();
        let callback_url = callback_url.to_string();
        let options = input.provider_options.clone();
        let request_id: String = ctx
            .run(|| async move {
                match soniox::transcribe_with_callback(
                    &client,
                    &audio_url,
                    &callback_url,
                    &api_key,
                    options.as_ref(),
                )
                .await
                {
                    Ok(id) => Ok(id),
                    Err(e) if !e.is_retryable => Err(TerminalError::new(e.message).into()),
                    Err(e) => Err(e.into()),
                }
            })
            .name("submit-soniox-transcription")
            .retry_policy(retry_policy.clone())
            .await?;

        ctx.set("providerRequestId", Json(request_id));

        let callback_timeout = ctx.sleep(Duration::from_secs(600));
        let promise = ctx.promise::<String>("transcription_id");

        let transcription_id: String = tokio::select! {
            result = promise => result?,
            result = callback_timeout => {
                result?;
                return Err(TerminalError::new("Timed out waiting for Soniox callback").into());
            }
        };

        let client = self.client.clone();
        let api_key = self.config.soniox_api_key.clone();
        let raw: Json<serde_json::Value> = ctx
            .run(|| async move {
                soniox::fetch_transcript_raw(&client, &transcription_id, &api_key)
                    .await
                    .map(Json)
                    .map_err(|e| TerminalError::new(e.message).into())
            })
            .name("fetch-soniox-transcript")
            .retry_policy(retry_policy.clone())
            .await?;
        let raw = raw.into_inner();

        ctx.set("rawResult", Json(raw.clone()));
        ctx.set("status", Json(PipelineStatus::Done));

        let provider_request_id = ctx
            .get::<Json<String>>("providerRequestId")
            .await?
            .map(|j| j.into_inner());

        Ok(SttFileOutput {
            status: PipelineStatus::Done,
            provider: "soniox".to_string(),
            provider_request_id,
            raw_result: raw,
        })
    }

    async fn run_deepgram(
        &self,
        ctx: &WorkflowContext<'_>,
        audio_url: &str,
        callback_url: &str,
        input: &SttFileInput,
        retry_policy: &RunRetryPolicy,
    ) -> Result<SttFileOutput, HandlerError> {
        let api_key = self
            .config
            .deepgram_api_key
            .as_deref()
            .ok_or_else(|| TerminalError::new("deepgram_api_key not configured"))?
            .to_string();

        let client = self.client.clone();
        let audio_url = audio_url.to_string();
        let callback_url = callback_url.to_string();
        let options = input.provider_options.clone();
        let request_id: String = ctx
            .run(|| async move {
                match deepgram::transcribe_with_callback(
                    &client,
                    &audio_url,
                    &callback_url,
                    &api_key,
                    options.as_ref(),
                )
                .await
                {
                    Ok(id) => Ok(id),
                    Err(e) if !e.is_retryable => Err(TerminalError::new(e.message).into()),
                    Err(e) => Err(e.into()),
                }
            })
            .name("submit-deepgram-transcription")
            .retry_policy(retry_policy.clone())
            .await?;

        ctx.set("providerRequestId", Json(request_id));

        // Deepgram posts full transcript payload to callback; no fetch step needed
        let callback_timeout = ctx.sleep(Duration::from_secs(600));
        let promise = ctx.promise::<Json<serde_json::Value>>("callback_result");

        let raw: serde_json::Value = tokio::select! {
            result = promise => result?.into_inner(),
            result = callback_timeout => {
                result?;
                return Err(TerminalError::new("Timed out waiting for Deepgram callback").into());
            }
        };

        ctx.set("rawResult", Json(raw.clone()));
        ctx.set("status", Json(PipelineStatus::Done));

        let provider_request_id = ctx
            .get::<Json<String>>("providerRequestId")
            .await?
            .map(|j| j.into_inner());

        Ok(SttFileOutput {
            status: PipelineStatus::Done,
            provider: "deepgram".to_string(),
            provider_request_id,
            raw_result: raw,
        })
    }
}

impl SttFile for SttFileImpl {
    async fn run(
        &self,
        ctx: WorkflowContext<'_>,
        input: Json<SttFileInput>,
    ) -> Result<Json<SttFileOutput>, HandlerError> {
        let input = input.into_inner();
        tracing::info!(
            file_id = %input.file_id,
            user_id = %input.user_id,
            provider = %input.provider,
            "stt workflow started"
        );

        let file_id = input.file_id.clone();
        let result = self.run_inner(&ctx, &input).await;

        if let Err(ref e) = result {
            tracing::error!(file_id = %file_id, error = ?e, "stt workflow failed");
            ctx.set("status", Json(PipelineStatus::Error));
            ctx.set("error", Json(format!("{:?}", e)));
        } else {
            tracing::info!(file_id = %file_id, "stt workflow completed");
        }

        let config = self.config;
        let client = self.client.clone();
        let _ = ctx
            .run(|| async move {
                if let Err(e) = supabase::delete_file(&client, config, &file_id).await {
                    tracing::error!(file_id = %file_id, error = %e, "failed to delete audio file");
                }
                Ok(())
            })
            .name("delete-audio-file")
            .await;

        result.map(Json)
    }

    async fn on_transcript(
        &self,
        ctx: SharedWorkflowContext<'_>,
        payload: Json<serde_json::Value>,
    ) -> Result<(), HandlerError> {
        let payload = payload.into_inner();
        let existing = ctx.get::<Json<serde_json::Value>>("rawResult").await?;
        if existing.is_some() {
            return Ok(());
        }

        let provider = ctx
            .get::<Json<String>>("provider")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_else(|| "soniox".to_string());

        match provider.as_str() {
            "soniox" => {
                let callback: soniox::SonioxCallback = serde_json::from_value(payload)
                    .map_err(|e| TerminalError::new(e.to_string()))?;

                if callback.status == "error" {
                    ctx.reject_promise(
                        "transcription_id",
                        TerminalError::new("Soniox transcription failed"),
                    );
                    return Ok(());
                }

                ctx.resolve_promise("transcription_id", callback.id);
            }
            "deepgram" => {
                // Deepgram posts the full result payload directly
                ctx.resolve_promise("callback_result", Json(payload));
            }
            _ => {
                return Err(TerminalError::new(format!(
                    "unknown provider in callback: {provider}"
                ))
                .into());
            }
        }

        Ok(())
    }

    async fn get_status(
        &self,
        ctx: SharedWorkflowContext<'_>,
    ) -> Result<Json<SttStatusResponse>, HandlerError> {
        let status = ctx
            .get::<Json<PipelineStatus>>("status")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or(PipelineStatus::Queued);
        let provider = ctx
            .get::<Json<String>>("provider")
            .await?
            .map(|j| j.into_inner());
        let provider_request_id = ctx
            .get::<Json<String>>("providerRequestId")
            .await?
            .map(|j| j.into_inner());
        let raw_result = ctx
            .get::<Json<serde_json::Value>>("rawResult")
            .await?
            .map(|j| j.into_inner());
        let error = ctx
            .get::<Json<String>>("error")
            .await?
            .map(|j| j.into_inner());

        Ok(Json(SttStatusResponse {
            status,
            provider,
            provider_request_id,
            raw_result,
            error,
        }))
    }
}
