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
        }
    }

    pub async fn diarize_session(
        &self,
        session_id: String,
        max_speakers: usize,
    ) -> Result<Vec<hypr_pyannote_local::diarize::DiarizationSegment>, crate::Error> {
        use dasp::sample::Sample;
        use rodio::Source;
        use tauri_plugin_settings::SettingsPluginExt;

        let base = self
            .manager
            .settings()
            .cached_vault_base()
            .map_err(|e| crate::Error::DiarizeFailed(e.to_string()))?;

        let session_dir = base.join("sessions").join(&session_id);

        let audio_path = if session_dir.join("audio.wav").exists() {
            session_dir.join("audio.wav")
        } else if session_dir.join("audio.ogg").exists() {
            session_dir.join("audio.ogg")
        } else {
            return Err(crate::Error::DiarizeFailed(
                "no audio file found".to_string(),
            ));
        };

        let segments = tokio::task::spawn_blocking(move || {
            let decoder = hypr_audio_utils::source_from_path(&audio_path)
                .map_err(|e| crate::Error::DiarizeFailed(e.to_string()))?;

            let channels = decoder.channels() as usize;
            let sample_rate = decoder.sample_rate();
            let f32_samples: Vec<f32> = decoder.collect();

            let mono: Vec<f32> = if channels > 1 {
                f32_samples
                    .chunks_exact(channels)
                    .map(|frame| frame.iter().sum::<f32>() / channels as f32)
                    .collect()
            } else {
                f32_samples
            };

            let resampled = if sample_rate != 16000 {
                let source = rodio::buffer::SamplesBuffer::new(1, sample_rate, mono);
                hypr_audio_utils::resample_audio(source, 16000)
                    .map_err(|e| crate::Error::DiarizeFailed(e.to_string()))?
            } else {
                mono
            };

            let i16_samples: Vec<i16> = resampled.iter().map(|s| s.to_sample()).collect();

            let opts = hypr_pyannote_local::diarize::DiarizeOptions {
                max_speakers,
                ..Default::default()
            };

            hypr_pyannote_local::diarize::diarize(&i16_samples, 16000, Some(opts))
                .map_err(|e| crate::Error::DiarizeFailed(e.to_string()))
        })
        .await
        .map_err(|e| crate::Error::DiarizeFailed(format!("join error: {e}")))?;

        segments
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
