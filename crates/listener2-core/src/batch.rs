use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::StreamExt;
use owhisper_client::{
    AdapterKind, ArgmaxAdapter, AssemblyAIAdapter, BatchSttAdapter, CactusAdapter,
    DashScopeAdapter, DeepgramAdapter, ElevenLabsAdapter, FireworksAdapter, GladiaAdapter,
    HyprnoteAdapter, MistralAdapter, OpenAIAdapter, RealtimeSttAdapter, SonioxAdapter,
};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SpawnErr};
use tokio_stream::{self as tokio_stream, StreamExt as TokioStreamExt};
use tracing::Instrument;

use crate::{BatchEvent, BatchRuntime};

const BATCH_STREAM_TIMEOUT_SECS: u64 = 30;
const DEFAULT_CHUNK_MS: u64 = 500;
const DEFAULT_DELAY_MS: u64 = 20;
const DEVICE_FINGERPRINT_HEADER: &str = "x-device-fingerprint";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[serde(rename_all = "lowercase")]
pub enum BatchProvider {
    Deepgram,
    Soniox,
    AssemblyAI,
    Am,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
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

pub async fn run_batch(runtime: Arc<dyn BatchRuntime>, params: BatchParams) -> crate::Result<()> {
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

    match params.provider {
        BatchProvider::Am => run_batch_am(runtime, params, listen_params).await,
        BatchProvider::Deepgram => {
            run_batch_simple::<DeepgramAdapter>(runtime, params, listen_params).await
        }
        BatchProvider::Soniox => {
            run_batch_simple::<SonioxAdapter>(runtime, params, listen_params).await
        }
        BatchProvider::AssemblyAI => {
            run_batch_simple::<AssemblyAIAdapter>(runtime, params, listen_params).await
        }
    }
}

// Simple (non-streaming) batch: upload file, get result
async fn run_batch_simple<A: BatchSttAdapter>(
    runtime: Arc<dyn BatchRuntime>,
    params: BatchParams,
    listen_params: owhisper_interface::ListenParams,
) -> crate::Result<()> {
    let span = session_span(&params.session_id);

    async {
        runtime.emit(BatchEvent::BatchStarted {
            session_id: params.session_id.clone(),
        });

        let client = owhisper_client::BatchClient::<A>::builder()
            .api_base(params.base_url.clone())
            .api_key(params.api_key.clone())
            .params(listen_params)
            .build();

        tracing::debug!("transcribing file: {}", params.file_path);
        let response = client.transcribe_file(&params.file_path).await?;
        tracing::info!("batch transcription completed");

        runtime.emit(BatchEvent::BatchResponse {
            session_id: params.session_id.clone(),
            response,
        });

        Ok(())
    }
    .instrument(span)
    .await
}

// Streaming batch via actor
async fn run_batch_am(
    runtime: Arc<dyn BatchRuntime>,
    params: BatchParams,
    listen_params: owhisper_interface::ListenParams,
) -> crate::Result<()> {
    let span = session_span(&params.session_id);

    async {
        let (start_tx, start_rx) =
            tokio::sync::oneshot::channel::<std::result::Result<(), String>>();
        let start_notifier = Arc::new(Mutex::new(Some(start_tx)));

        let args = BatchArgs {
            runtime: runtime.clone(),
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
                runtime.emit(BatchEvent::BatchStarted {
                    session_id: params.session_id.clone(),
                });
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

// --- Actor internals ---

fn session_span(session_id: &str) -> tracing::Span {
    tracing::info_span!("session", session_id = %session_id)
}

fn format_user_friendly_error(error: &str) -> String {
    let error_lower = error.to_lowercase();

    if error_lower.contains("401") || error_lower.contains("unauthorized") {
        return "Authentication failed. Please check your API key in settings.".to_string();
    }
    if error_lower.contains("403") || error_lower.contains("forbidden") {
        return "Access denied. Your API key may not have permission for this operation."
            .to_string();
    }
    if error_lower.contains("429") || error_lower.contains("rate limit") {
        return "Rate limit exceeded. Please wait a moment and try again.".to_string();
    }
    if error_lower.contains("timeout") {
        return "Connection timed out. Please check your internet connection and try again."
            .to_string();
    }
    if error_lower.contains("connection refused")
        || error_lower.contains("failed to connect")
        || error_lower.contains("network")
    {
        return "Could not connect to the transcription service. Please check your internet connection.".to_string();
    }
    if error_lower.contains("invalid audio")
        || error_lower.contains("unsupported format")
        || error_lower.contains("codec")
    {
        return "The audio file format is not supported. Please try a different file.".to_string();
    }
    if error_lower.contains("file not found") || error_lower.contains("no such file") {
        return "Audio file not found. The recording may have been moved or deleted.".to_string();
    }

    error.to_string()
}

#[allow(clippy::enum_variant_names)]
enum BatchMsg {
    StreamResponse {
        response: Box<StreamResponse>,
        percentage: f64,
    },
    StreamError(String),
    StreamEnded,
    StreamStartFailed(String),
}

type BatchStartNotifier = Arc<Mutex<Option<tokio::sync::oneshot::Sender<Result<(), String>>>>>;

#[derive(Clone)]
struct BatchArgs {
    runtime: Arc<dyn BatchRuntime>,
    file_path: String,
    base_url: String,
    api_key: String,
    listen_params: owhisper_interface::ListenParams,
    start_notifier: BatchStartNotifier,
    session_id: String,
}

struct BatchState {
    runtime: Arc<dyn BatchRuntime>,
    session_id: String,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl BatchState {
    fn emit_streamed(&self, response: StreamResponse, percentage: f64) {
        self.runtime.emit(BatchEvent::BatchResponseStreamed {
            session_id: self.session_id.clone(),
            response,
            percentage,
        });
    }

    fn emit_failure(&self, error: String) {
        self.runtime.emit(BatchEvent::BatchFailed {
            session_id: self.session_id.clone(),
            error,
        });
    }
}

struct BatchActor;

impl BatchActor {
    fn name() -> ActorName {
        "batch_actor".into()
    }
}

async fn spawn_batch_actor(args: BatchArgs) -> Result<ActorRef<BatchMsg>, SpawnErr> {
    let (batch_ref, _) = Actor::spawn(Some(BatchActor::name()), BatchActor, args).await?;
    Ok(batch_ref)
}

#[ractor::async_trait]
impl Actor for BatchActor {
    type Msg = BatchMsg;
    type State = BatchState;
    type Arguments = BatchArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let (rx_task, shutdown_tx) = spawn_batch_task(args.clone(), myself).await?;

        let state = BatchState {
            runtime: args.runtime,
            session_id: args.session_id,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
        };

        Ok(state)
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(shutdown_tx) = state.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
            let _ = (&mut state.rx_task).await;
        }

        Ok(())
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            BatchMsg::StreamResponse {
                response,
                percentage,
            } => {
                tracing::info!("batch stream response received");
                state.emit_streamed(*response, percentage);
            }

            BatchMsg::StreamStartFailed(error) => {
                tracing::info!("batch_stream_start_failed: {}", error);
                state.emit_failure(error.clone());
                myself.stop(Some(format!("batch_stream_start_failed: {}", error)));
            }

            BatchMsg::StreamError(error) => {
                tracing::info!("batch_stream_error: {}", error);
                state.emit_failure(error.clone());
                myself.stop(None);
            }

            BatchMsg::StreamEnded => {
                tracing::info!("batch_stream_ended");
                myself.stop(None);
            }
        }
        Ok(())
    }
}

// --- Task spawning ---

async fn spawn_batch_task(
    args: BatchArgs,
    myself: ActorRef<BatchMsg>,
) -> Result<
    (
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let adapter_kind = AdapterKind::from_url_and_languages(
        &args.base_url,
        &args.listen_params.languages,
        args.listen_params.model.as_deref(),
    );

    match adapter_kind {
        AdapterKind::Argmax => spawn_argmax_streaming_batch_task(args, myself).await,
        AdapterKind::Soniox => spawn_batch_task_with_adapter::<SonioxAdapter>(args, myself).await,
        AdapterKind::Fireworks => {
            spawn_batch_task_with_adapter::<FireworksAdapter>(args, myself).await
        }
        AdapterKind::Deepgram => {
            spawn_batch_task_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        AdapterKind::AssemblyAI => {
            spawn_batch_task_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        AdapterKind::OpenAI => spawn_batch_task_with_adapter::<OpenAIAdapter>(args, myself).await,
        AdapterKind::Gladia => spawn_batch_task_with_adapter::<GladiaAdapter>(args, myself).await,
        AdapterKind::ElevenLabs => {
            spawn_batch_task_with_adapter::<ElevenLabsAdapter>(args, myself).await
        }
        AdapterKind::DashScope => {
            spawn_batch_task_with_adapter::<DashScopeAdapter>(args, myself).await
        }
        AdapterKind::Mistral => spawn_batch_task_with_adapter::<MistralAdapter>(args, myself).await,
        AdapterKind::Hyprnote => {
            spawn_batch_task_with_adapter::<HyprnoteAdapter>(args, myself).await
        }
        AdapterKind::Cactus => spawn_batch_task_with_adapter::<CactusAdapter>(args, myself).await,
    }
}

async fn spawn_argmax_streaming_batch_task(
    args: BatchArgs,
    myself: ActorRef<BatchMsg>,
) -> Result<
    (
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let rx_task = tokio::spawn(async move {
        tracing::info!("argmax streaming batch task: starting");
        let start_notifier = args.start_notifier.clone();

        let stream_result = ArgmaxAdapter::transcribe_file_streaming(
            &args.base_url,
            &args.api_key,
            &args.listen_params,
            &args.file_path,
            None,
        )
        .await;

        let mut stream = match stream_result {
            Ok(s) => {
                notify_start_result(&start_notifier, Ok(()));
                s
            }
            Err(e) => {
                let raw_error = format!("{:?}", e);
                let error = format_user_friendly_error(&raw_error);
                tracing::error!("argmax streaming batch task: failed to start: {:?}", e);
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
        };

        let response_timeout = Duration::from_secs(BATCH_STREAM_TIMEOUT_SECS);
        let mut response_count = 0;
        let mut ended_cleanly = false;

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    tracing::info!("argmax streaming batch task: shutdown");
                    ended_cleanly = true;
                    break;
                }
                result = tokio::time::timeout(response_timeout, StreamExt::next(&mut stream)) => {
                    match result {
                        Ok(Some(Ok(event))) => {
                            response_count += 1;

                            let is_from_finalize = matches!(
                                &event.response,
                                StreamResponse::TranscriptResponse { from_finalize, .. } if *from_finalize
                            );

                            tracing::info!(
                                "argmax streaming batch: response #{}{}",
                                response_count,
                                if is_from_finalize { " (from_finalize)" } else { "" }
                            );

                            if let Err(e) = myself.send_message(BatchMsg::StreamResponse {
                                response: Box::new(event.response),
                                percentage: event.percentage,
                            }) {
                                tracing::error!("failed to send stream response message: {:?}", e);
                            }

                            if is_from_finalize {
                                ended_cleanly = true;
                                break;
                            }
                        }
                        Ok(Some(Err(e))) => {
                            let raw_error = format!("{:?}", e);
                            let error = format_user_friendly_error(&raw_error);
                            tracing::error!("argmax streaming batch error: {:?}", e);
                            let _ = myself.send_message(BatchMsg::StreamError(error));
                            break;
                        }
                        Ok(None) => {
                            tracing::info!("argmax streaming batch completed (total: {})", response_count);
                            ended_cleanly = true;
                            break;
                        }
                        Err(elapsed) => {
                            tracing::warn!(timeout = ?elapsed, responses = response_count, "argmax streaming batch timeout");
                            let _ = myself.send_message(BatchMsg::StreamError(format_user_friendly_error("timeout waiting for response")));
                            break;
                        }
                    }
                }
            }
        }

        if ended_cleanly && let Err(e) = myself.send_message(BatchMsg::StreamEnded) {
            tracing::error!("failed to send stream ended message: {:?}", e);
        }
        tracing::info!("argmax streaming batch task exited");
    });

    Ok((rx_task, shutdown_tx))
}

async fn spawn_batch_task_with_adapter<A: RealtimeSttAdapter>(
    args: BatchArgs,
    myself: ActorRef<BatchMsg>,
) -> Result<
    (
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let rx_task = tokio::spawn(async move {
        tracing::info!("batch task: loading audio chunks from file");
        let stream_config = BatchStreamConfig::new(DEFAULT_CHUNK_MS, DEFAULT_DELAY_MS);
        let start_notifier = args.start_notifier.clone();

        let chunk_result = tokio::task::spawn_blocking({
            let path = PathBuf::from(&args.file_path);
            let chunk_ms = stream_config.chunk_ms;
            move || hypr_audio_utils::chunk_audio_file(path, chunk_ms)
        })
        .await;

        let chunked_audio = match chunk_result {
            Ok(Ok(data)) => {
                tracing::info!("batch task: loaded {} audio chunks", data.chunks.len());
                data
            }
            Ok(Err(e)) => {
                let raw_error = format!("{:?}", e);
                let error = format_user_friendly_error(&raw_error);
                tracing::error!("batch task: failed to load audio chunks: {:?}", e);
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
            Err(join_err) => {
                let raw_error = format!("{:?}", join_err);
                let error = format_user_friendly_error(&raw_error);
                tracing::error!(
                    "batch task: audio chunk loading task panicked: {:?}",
                    join_err
                );
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
        };

        let frame_count = chunked_audio.frame_count;
        let metadata = chunked_audio.metadata;
        let audio_duration_secs = if frame_count == 0 || metadata.sample_rate == 0 {
            0.0
        } else {
            frame_count as f64 / metadata.sample_rate as f64
        };

        let channel_count = metadata.channels.clamp(1, 2);
        let listen_params = owhisper_interface::ListenParams {
            channels: metadata.channels,
            sample_rate: metadata.sample_rate,
            ..args.listen_params.clone()
        };
        let client = owhisper_client::ListenClient::builder()
            .adapter::<A>()
            .api_base(args.base_url)
            .api_key(args.api_key)
            .params(listen_params)
            .extra_header(DEVICE_FINGERPRINT_HEADER, hypr_host::fingerprint())
            .build_with_channels(channel_count)
            .await;

        let chunk_count = chunked_audio.chunks.len();
        let chunk_interval = stream_config.chunk_interval();

        let audio_stream =
            tokio_stream::iter(chunked_audio.chunks.into_iter().map(MixedMessage::Audio));
        let finalize_stream =
            tokio_stream::iter(vec![MixedMessage::Control(ControlMessage::Finalize)]);
        let outbound = TokioStreamExt::throttle(
            TokioStreamExt::chain(audio_stream, finalize_stream),
            chunk_interval,
        );

        tracing::info!(
            "batch task: starting audio stream with {} chunks + finalize message",
            chunk_count
        );
        let (listen_stream, _handle) = match client.from_realtime_audio(Box::pin(outbound)).await {
            Ok(res) => res,
            Err(e) => {
                let raw_error = format!("{:?}", e);
                let error = format_user_friendly_error(&raw_error);
                tracing::error!("batch task: failed to start audio stream: {:?}", e);
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
        };
        notify_start_result(&start_notifier, Ok(()));
        futures_util::pin_mut!(listen_stream);

        process_batch_stream(listen_stream, myself, shutdown_rx, audio_duration_secs).await;
    });

    Ok((rx_task, shutdown_tx))
}

// --- Stream processing ---

#[derive(Clone, Copy)]
struct BatchStreamConfig {
    chunk_ms: u64,
    delay_ms: u64,
}

impl BatchStreamConfig {
    fn new(chunk_ms: u64, delay_ms: u64) -> Self {
        Self {
            chunk_ms: chunk_ms.max(1),
            delay_ms,
        }
    }

    fn chunk_interval(&self) -> Duration {
        Duration::from_millis(self.delay_ms)
    }
}

fn notify_start_result(notifier: &BatchStartNotifier, result: Result<(), String>) {
    if let Ok(mut guard) = notifier.lock()
        && let Some(sender) = guard.take()
    {
        let _ = sender.send(result);
    }
}

async fn process_batch_stream<S, E>(
    mut listen_stream: std::pin::Pin<&mut S>,
    myself: ActorRef<BatchMsg>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    audio_duration_secs: f64,
) where
    S: futures_util::Stream<Item = Result<StreamResponse, E>>,
    E: std::fmt::Debug,
{
    let mut response_count = 0;
    let response_timeout = Duration::from_secs(BATCH_STREAM_TIMEOUT_SECS);
    let mut ended_cleanly = false;

    loop {
        tracing::debug!(
            "batch stream: waiting for next item (received {} so far)",
            response_count
        );

        tokio::select! {
            _ = &mut shutdown_rx => {
                tracing::info!("batch_stream_shutdown");
                ended_cleanly = true;
                break;
            }
            result = tokio::time::timeout(
                response_timeout,
                futures_util::StreamExt::next(&mut listen_stream),
            ) => {
                tracing::debug!("batch stream: received result");
                match result {
                    Ok(Some(Ok(response))) => {
                        response_count += 1;

                        let is_from_finalize = matches!(
                            &response,
                            StreamResponse::TranscriptResponse { from_finalize, .. } if *from_finalize
                        );

                        tracing::info!(
                            "batch stream: sending response #{}{}",
                            response_count,
                            if is_from_finalize { " (from_finalize)" } else { "" }
                        );

                        let percentage = compute_percentage(&response, audio_duration_secs);
                        if let Err(e) = myself.send_message(BatchMsg::StreamResponse {
                            response: Box::new(response),
                            percentage,
                        }) {
                            tracing::error!("failed to send stream response message: {:?}", e);
                        }

                        if is_from_finalize {
                            ended_cleanly = true;
                            break;
                        }
                    }
                    Ok(Some(Err(e))) => {
                        let raw_error = format!("{:?}", e);
                        let error = format_user_friendly_error(&raw_error);
                        tracing::error!("batch stream error: {:?}", e);
                        if let Err(send_err) = myself.send_message(BatchMsg::StreamError(error)) {
                            tracing::error!("failed to send stream error message: {:?}", send_err);
                        }
                        break;
                    }
                    Ok(None) => {
                        tracing::info!("batch stream completed (total responses: {})", response_count);
                        ended_cleanly = true;
                        break;
                    }
                    Err(elapsed) => {
                        tracing::warn!(timeout = ?elapsed, responses = response_count, "batch stream response timeout");
                        if let Err(send_err) = myself.send_message(BatchMsg::StreamError(format_user_friendly_error("timeout waiting for batch stream response"))) {
                            tracing::error!("failed to send timeout error message: {:?}", send_err);
                        }
                        break;
                    }
                }
            }
        }
    }

    if ended_cleanly && let Err(e) = myself.send_message(BatchMsg::StreamEnded) {
        tracing::error!("failed to send stream ended message: {:?}", e);
    }
    tracing::info!("batch stream processing loop exited");
}

fn compute_percentage(response: &StreamResponse, audio_duration_secs: f64) -> f64 {
    let transcript_end = transcript_end_from_response(response);
    match transcript_end {
        Some(end) if audio_duration_secs > 0.0 => (end / audio_duration_secs).clamp(0.0, 1.0),
        _ => 0.0,
    }
}

fn transcript_end_from_response(response: &StreamResponse) -> Option<f64> {
    let StreamResponse::TranscriptResponse {
        start,
        duration,
        channel,
        ..
    } = response
    else {
        return None;
    };

    let mut end = (*start + *duration).max(0.0);

    for alternative in &channel.alternatives {
        for word in &alternative.words {
            if word.end.is_finite() {
                end = end.max(word.end);
            }
        }
    }

    if end.is_finite() { Some(end) } else { None }
}
