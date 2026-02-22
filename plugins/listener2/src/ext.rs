use std::sync::{Arc, Mutex};

use owhisper_client::BatchSttAdapter;
use tauri_specta::Event;
use tracing::Instrument;

use crate::BatchEvent;
use crate::batch::{BatchArgs, spawn_batch_actor};

/// Creates a tracing span with session context that child events will inherit
fn session_span(session_id: &str) -> tracing::Span {
    tracing::info_span!("session", session_id = %session_id)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum BatchProvider {
    Deepgram,
    Soniox,
    AssemblyAI,
    Am,
    Pyannote,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct BatchParams {
    pub session_id: String,
    pub provider: BatchProvider,
    pub file_path: String,
    #[serde(default)]
    pub model: Option<String>,
    pub base_url: String,
    pub api_key: String,
    #[serde(default)]
    pub languages: Vec<hypr_language::Language>,
    #[serde(default)]
    pub keywords: Vec<String>,
}

pub struct Listener2<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Listener2<'a, R, M> {
    #[tracing::instrument(skip_all)]
    pub async fn run_batch(&self, params: BatchParams) -> Result<(), crate::Error> {
        let metadata = tokio::task::spawn_blocking({
            let path = params.file_path.clone();
            move || hypr_audio_utils::audio_file_metadata(path)
        })
        .await
        .map_err(|err| {
            crate::Error::BatchStartFailed(format!("failed to join audio metadata task: {err:?}"))
        })?
        .map_err(|err| {
            crate::Error::BatchStartFailed(format!("failed to read audio metadata: {err}"))
        })?;

        let listen_params = owhisper_interface::ListenParams {
            model: params.model.clone(),
            channels: metadata.channels,
            sample_rate: metadata.sample_rate,
            languages: params.languages.clone(),
            keywords: params.keywords.clone(),
            custom_query: None,
        };

        let state = self.manager.state::<crate::SharedState>();
        let guard = state.lock().await;
        let app = guard.app.clone();
        drop(guard);

        match params.provider {
            BatchProvider::Am => run_batch_am(app, params, listen_params).await,
            BatchProvider::Deepgram => {
                run_batch_with_adapter::<owhisper_client::DeepgramAdapter>(
                    app,
                    params,
                    listen_params,
                )
                .await
            }
            BatchProvider::Soniox => {
                run_batch_with_adapter::<owhisper_client::SonioxAdapter>(app, params, listen_params)
                    .await
            }
            BatchProvider::AssemblyAI => {
                run_batch_with_adapter::<owhisper_client::AssemblyAIAdapter>(
                    app,
                    params,
                    listen_params,
                )
                .await
            }
            BatchProvider::Pyannote => run_batch_pyannote(app, params).await,
        }
    }

    pub fn parse_subtitle(&self, path: String) -> Result<crate::Subtitle, String> {
        use aspasia::TimedSubtitleFile;
        let sub = TimedSubtitleFile::new(&path).unwrap();
        Ok(sub.into())
    }

    pub fn export_to_vtt(
        &self,
        session_id: String,
        words: Vec<crate::VttWord>,
    ) -> Result<String, String> {
        use aspasia::{Moment, Subtitle, WebVttSubtitle, webvtt::WebVttCue};
        use tauri_plugin_settings::SettingsPluginExt;

        let base = self
            .manager
            .settings()
            .cached_vault_base()
            .map_err(|e| e.to_string())?;
        let session_dir = base.join("sessions").join(&session_id);

        std::fs::create_dir_all(&session_dir).map_err(|e| e.to_string())?;

        let vtt_path = session_dir.join("transcript.vtt");

        let cues: Vec<WebVttCue> = words
            .into_iter()
            .map(|word| {
                let start_i64 = i64::try_from(word.start_ms)
                    .map_err(|_| format!("start_ms {} exceeds i64::MAX", word.start_ms))?;
                let end_i64 = i64::try_from(word.end_ms)
                    .map_err(|_| format!("end_ms {} exceeds i64::MAX", word.end_ms))?;

                Ok(WebVttCue {
                    identifier: word.speaker,
                    text: word.text,
                    settings: None,
                    start: Moment::from(start_i64),
                    end: Moment::from(end_i64),
                })
            })
            .collect::<Result<_, String>>()?;

        let vtt = WebVttSubtitle::builder().cues(cues).build();
        vtt.export(&vtt_path).map_err(|e| e.to_string())?;

        Ok(vtt_path.to_string())
    }
}

pub trait Listener2PluginExt<R: tauri::Runtime> {
    fn listener2(&self) -> Listener2<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Listener2PluginExt<R> for T {
    fn listener2(&self) -> Listener2<'_, R, Self>
    where
        Self: Sized,
    {
        Listener2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

async fn run_batch_with_adapter<A: BatchSttAdapter>(
    app: tauri::AppHandle,
    params: BatchParams,
    listen_params: owhisper_interface::ListenParams,
) -> Result<(), crate::Error> {
    let span = session_span(&params.session_id);

    async {
        BatchEvent::BatchStarted {
            session_id: params.session_id.clone(),
        }
        .emit(&app)
        .map_err(|e| {
            crate::Error::BatchStartFailed(format!("failed to emit BatchStarted event: {e}"))
        })?;

        let client = owhisper_client::BatchClient::<A>::builder()
            .api_base(params.base_url.clone())
            .api_key(params.api_key.clone())
            .params(listen_params)
            .build();

        tracing::debug!("transcribing file: {}", params.file_path);
        let response = client.transcribe_file(&params.file_path).await?;

        tracing::info!("batch transcription completed");

        BatchEvent::BatchResponse {
            session_id: params.session_id.clone(),
            response,
        }
        .emit(&app)
        .map_err(|e| {
            crate::Error::BatchStartFailed(format!("failed to emit BatchResponse event: {e}"))
        })?;

        Ok(())
    }
    .instrument(span)
    .await
}

async fn run_batch_am(
    app: tauri::AppHandle,
    params: BatchParams,
    listen_params: owhisper_interface::ListenParams,
) -> Result<(), crate::Error> {
    let span = session_span(&params.session_id);

    async {
        let (start_tx, start_rx) =
            tokio::sync::oneshot::channel::<std::result::Result<(), String>>();
        let start_notifier = Arc::new(Mutex::new(Some(start_tx)));

        let args = BatchArgs {
            app: app.clone(),
            file_path: params.file_path.clone(),
            base_url: params.base_url.clone(),
            api_key: params.api_key.clone(),
            listen_params: listen_params.clone(),
            start_notifier: start_notifier.clone(),
            session_id: params.session_id.clone(),
        };

        match spawn_batch_actor(args).await {
            Ok(_) => {
                tracing::info!("batch actor spawned successfully");
                BatchEvent::BatchStarted {
                    session_id: params.session_id.clone(),
                }
                .emit(&app)
                .unwrap();
            }
            Err(e) => {
                tracing::error!("batch supervisor spawn failed: {:?}", e);
                if let Ok(mut notifier) = start_notifier.lock()
                    && let Some(tx) = notifier.take()
                {
                    let _ = tx.send(Err(format!("failed to spawn batch supervisor: {e:?}")));
                }
                return Err(e.into());
            }
        }

        match start_rx.await {
            Ok(Ok(())) => Ok(()),
            Ok(Err(error)) => {
                tracing::error!("batch actor reported start failure: {}", error);
                Err(crate::Error::BatchStartFailed(error))
            }
            Err(_) => {
                tracing::error!("batch actor start notifier dropped before reporting result");
                Err(crate::Error::BatchStartFailed(
                    "batch stream start cancelled unexpectedly".to_string(),
                ))
            }
        }
    }
    .instrument(span)
    .await
}

const PYANNOTE_POLL_INTERVAL: std::time::Duration = std::time::Duration::from_secs(2);
const PYANNOTE_POLL_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(600);

fn make_pyannote_client(
    base_url: &str,
    api_key: &str,
) -> Result<hypr_pyannote_cloud::Client, crate::Error> {
    let mut headers = reqwest::header::HeaderMap::new();
    let auth_value = reqwest::header::HeaderValue::from_str(&format!("Bearer {api_key}"))
        .map_err(|e| crate::Error::Pyannote(format!("invalid api key: {e}")))?;
    headers.insert(reqwest::header::AUTHORIZATION, auth_value);

    let http_client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| crate::Error::Pyannote(format!("failed to build http client: {e}")))?;

    Ok(hypr_pyannote_cloud::Client::new_with_client(
        base_url,
        http_client,
    ))
}

async fn pyannote_upload_audio(
    client: &hypr_pyannote_cloud::Client,
    file_path: &str,
) -> Result<String, crate::Error> {
    let media_key = format!("media://{}", uuid::Uuid::new_v4());
    let media_url_parsed = media_key
        .parse()
        .map_err(|e| crate::Error::Pyannote(format!("failed to parse media url: {e}")))?;

    let upload_body = hypr_pyannote_cloud::types::GetMediaUploadUrl {
        url: media_url_parsed,
    };

    let upload_response = client
        .get_media_upload_url(&upload_body)
        .await
        .map_err(|e| crate::Error::Pyannote(format!("failed to get upload url: {e}")))?;

    let presigned_url = upload_response.into_inner().url;

    let file_bytes = tokio::fs::read(file_path)
        .await
        .map_err(|e| crate::Error::Pyannote(format!("failed to read audio file: {e}")))?;

    let http_client = reqwest::Client::new();
    let put_response = http_client
        .put(&presigned_url)
        .body(file_bytes)
        .send()
        .await
        .map_err(|e| crate::Error::Pyannote(format!("failed to upload audio: {e}")))?;

    if !put_response.status().is_success() {
        return Err(crate::Error::Pyannote(format!(
            "audio upload failed with status: {}",
            put_response.status()
        )));
    }

    Ok(media_key)
}

async fn pyannote_poll_job(
    client: &hypr_pyannote_cloud::Client,
    job_id: &str,
) -> Result<hypr_pyannote_cloud::types::GetJobByIdResponse, crate::Error> {
    let start = std::time::Instant::now();

    loop {
        if start.elapsed() > PYANNOTE_POLL_TIMEOUT {
            return Err(crate::Error::Pyannote(format!(
                "job {} timed out after {:?}",
                job_id, PYANNOTE_POLL_TIMEOUT
            )));
        }

        let response = client
            .get_job_by_id(job_id)
            .await
            .map_err(|e| crate::Error::Pyannote(format!("failed to poll job {job_id}: {e}")))?;

        let job = response.into_inner();

        let status = match &job {
            hypr_pyannote_cloud::types::GetJobByIdResponse::DiarizationJob(j) => j.status.clone(),
            hypr_pyannote_cloud::types::GetJobByIdResponse::VoiceprintJob(j) => j.status.clone(),
            hypr_pyannote_cloud::types::GetJobByIdResponse::IdentifyJob(j) => j.status.clone(),
        };

        match status {
            Some(hypr_pyannote_cloud::types::JobStatus::Succeeded) => {
                tracing::info!("pyannote job {job_id} succeeded");
                return Ok(job);
            }
            Some(hypr_pyannote_cloud::types::JobStatus::Failed) => {
                return Err(crate::Error::Pyannote(format!(
                    "pyannote job {job_id} failed"
                )));
            }
            Some(hypr_pyannote_cloud::types::JobStatus::Canceled) => {
                return Err(crate::Error::Pyannote(format!(
                    "pyannote job {job_id} was canceled"
                )));
            }
            _ => {
                tracing::debug!("pyannote job {job_id} status: {status:?}, polling again...");
                tokio::time::sleep(PYANNOTE_POLL_INTERVAL).await;
            }
        }
    }
}

fn pyannote_diarization_to_batch_response(
    output: &hypr_pyannote_cloud::types::DiarizationJobOutput,
) -> owhisper_interface::batch::Response {
    // Build a speaker label -> index map from diarization segments
    let mut speaker_indices: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();
    for segment in &output.diarization {
        let next_idx = speaker_indices.len();
        speaker_indices
            .entry(segment.speaker.clone())
            .or_insert(next_idx);
    }

    // Prefer word-level transcription, fall back to turn-level
    let segments = if !output.word_level_transcription.is_empty() {
        &output.word_level_transcription
    } else {
        &output.turn_level_transcription
    };

    let words: Vec<owhisper_interface::batch::Word> = segments
        .iter()
        .map(|seg| {
            let speaker_idx = speaker_indices.get(&seg.speaker).copied();
            owhisper_interface::batch::Word {
                word: seg.text.clone(),
                start: seg.start,
                end: seg.end,
                confidence: 1.0,
                speaker: speaker_idx,
                punctuated_word: Some(seg.text.clone()),
            }
        })
        .collect();

    let transcript = words
        .iter()
        .map(|w| w.word.as_str())
        .collect::<Vec<_>>()
        .join(" ");

    owhisper_interface::batch::Response {
        metadata: serde_json::json!({
            "provider": "pyannote",
            "speakers": speaker_indices,
        }),
        results: owhisper_interface::batch::Results {
            channels: vec![owhisper_interface::batch::Channel {
                alternatives: vec![owhisper_interface::batch::Alternatives {
                    transcript,
                    confidence: 1.0,
                    words,
                }],
            }],
        },
    }
}

async fn run_batch_pyannote(
    app: tauri::AppHandle,
    params: BatchParams,
) -> Result<(), crate::Error> {
    let span = session_span(&params.session_id);

    async {
        BatchEvent::BatchStarted {
            session_id: params.session_id.clone(),
        }
        .emit(&app)
        .map_err(|e| {
            crate::Error::BatchStartFailed(format!("failed to emit BatchStarted event: {e}"))
        })?;

        let client = make_pyannote_client(&params.base_url, &params.api_key)?;

        tracing::info!("pyannote: uploading audio file: {}", params.file_path);
        let media_url = pyannote_upload_audio(&client, &params.file_path).await?;

        tracing::info!("pyannote: submitting diarization job with url: {media_url}");
        let diarize_request = hypr_pyannote_cloud::types::DiarizeRequest {
            url: media_url,
            transcription: true,
            confidence: false,
            exclusive: false,
            max_speakers: None,
            min_speakers: None,
            model: None,
            num_speakers: None,
            transcription_config: None,
            turn_level_confidence: None,
            webhook: None,
            webhook_status_only: false,
        };

        let job_created = client
            .diarize(&diarize_request)
            .await
            .map_err(|e| crate::Error::Pyannote(format!("failed to submit diarize job: {e}")))?
            .into_inner();

        let job_id = job_created.job_id;
        tracing::info!("pyannote: job created with id: {job_id}");

        let job_result = pyannote_poll_job(&client, &job_id).await?;

        let response = match job_result {
            hypr_pyannote_cloud::types::GetJobByIdResponse::DiarizationJob(job) => {
                match job.output {
                    Some(output) => pyannote_diarization_to_batch_response(&output),
                    None => {
                        return Err(crate::Error::Pyannote(
                            "diarization job succeeded but has no output".to_string(),
                        ));
                    }
                }
            }
            other => {
                return Err(crate::Error::Pyannote(format!(
                    "expected diarization job response, got: {other:?}"
                )));
            }
        };

        tracing::info!("pyannote: batch transcription completed");

        BatchEvent::BatchResponse {
            session_id: params.session_id.clone(),
            response,
        }
        .emit(&app)
        .map_err(|e| {
            crate::Error::BatchStartFailed(format!("failed to emit BatchResponse event: {e}"))
        })?;

        Ok(())
    }
    .instrument(span)
    .await
}
