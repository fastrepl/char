use std::sync::Arc;
use std::time::{Duration, UNIX_EPOCH};

use bytes::Bytes;
use ractor::{ActorProcessingErr, ActorRef};

use owhisper_client::{
    AdapterKind, ArgmaxAdapter, AssemblyAIAdapter, CactusAdapter, DashScopeAdapter,
    DeepgramAdapter, ElevenLabsAdapter, FireworksAdapter, GladiaAdapter, HyprnoteAdapter,
    MistralAdapter, OpenAIAdapter, RealtimeSttAdapter, SonioxAdapter, WebSocketConnectPolicy,
    WebSocketRetryCallback, WebSocketRetryEvent, hypr_ws_client,
};
use owhisper_interface::stream::Extra;
use owhisper_interface::{ControlMessage, MixedMessage};

use super::stream::process_stream;
use super::{ChannelSender, DEVICE_FINGERPRINT_HEADER, ListenerArgs, ListenerMsg, actor_error};
use crate::{ConnectionStage, DegradedError, SessionErrorEvent, SessionProgressEvent};

pub(super) const LISTEN_CONNECT_MAX_ATTEMPTS: usize = 3;
const LISTEN_CONNECT_RETRY_DELAY: Duration = Duration::from_millis(750);
const LISTEN_CONNECT_BUDGET: Duration = Duration::from_secs(12);

pub(super) async fn spawn_rx_task(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
        String,
    ),
    ActorProcessingErr,
> {
    let adapter_kind =
        AdapterKind::from_url_and_languages(&args.base_url, &args.languages, Some(&args.model));
    let is_dual = matches!(args.mode, crate::actors::ChannelMode::MicAndSpeaker);

    let result = match (adapter_kind, is_dual) {
        (AdapterKind::Argmax, false) => {
            spawn_rx_task_single_with_adapter::<ArgmaxAdapter>(args, myself).await
        }
        (AdapterKind::Argmax, true) => {
            spawn_rx_task_dual_with_adapter::<ArgmaxAdapter>(args, myself).await
        }
        (AdapterKind::Soniox, false) => {
            spawn_rx_task_single_with_adapter::<SonioxAdapter>(args, myself).await
        }
        (AdapterKind::Soniox, true) => {
            spawn_rx_task_dual_with_adapter::<SonioxAdapter>(args, myself).await
        }
        (AdapterKind::Fireworks, false) => {
            spawn_rx_task_single_with_adapter::<FireworksAdapter>(args, myself).await
        }
        (AdapterKind::Fireworks, true) => {
            spawn_rx_task_dual_with_adapter::<FireworksAdapter>(args, myself).await
        }
        (AdapterKind::Deepgram, false) => {
            spawn_rx_task_single_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        (AdapterKind::Deepgram, true) => {
            spawn_rx_task_dual_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        (AdapterKind::AssemblyAI, false) => {
            spawn_rx_task_single_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        (AdapterKind::AssemblyAI, true) => {
            spawn_rx_task_dual_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        (AdapterKind::OpenAI, false) => {
            spawn_rx_task_single_with_adapter::<OpenAIAdapter>(args, myself).await
        }
        (AdapterKind::OpenAI, true) => {
            spawn_rx_task_dual_with_adapter::<OpenAIAdapter>(args, myself).await
        }
        (AdapterKind::Gladia, false) => {
            spawn_rx_task_single_with_adapter::<GladiaAdapter>(args, myself).await
        }
        (AdapterKind::Gladia, true) => {
            spawn_rx_task_dual_with_adapter::<GladiaAdapter>(args, myself).await
        }
        (AdapterKind::ElevenLabs, false) => {
            spawn_rx_task_single_with_adapter::<ElevenLabsAdapter>(args, myself).await
        }
        (AdapterKind::ElevenLabs, true) => {
            spawn_rx_task_dual_with_adapter::<ElevenLabsAdapter>(args, myself).await
        }
        (AdapterKind::DashScope, false) => {
            spawn_rx_task_single_with_adapter::<DashScopeAdapter>(args, myself).await
        }
        (AdapterKind::DashScope, true) => {
            spawn_rx_task_dual_with_adapter::<DashScopeAdapter>(args, myself).await
        }
        (AdapterKind::Mistral, false) => {
            spawn_rx_task_single_with_adapter::<MistralAdapter>(args, myself).await
        }
        (AdapterKind::Mistral, true) => {
            spawn_rx_task_dual_with_adapter::<MistralAdapter>(args, myself).await
        }
        (AdapterKind::Hyprnote, false) => {
            spawn_rx_task_single_with_adapter::<HyprnoteAdapter>(args, myself).await
        }
        (AdapterKind::Hyprnote, true) => {
            spawn_rx_task_dual_with_adapter::<HyprnoteAdapter>(args, myself).await
        }
        (AdapterKind::Cactus, false) => {
            spawn_rx_task_single_with_adapter::<CactusAdapter>(args, myself).await
        }
        (AdapterKind::Cactus, true) => {
            spawn_rx_task_dual_with_adapter::<CactusAdapter>(args, myself).await
        }
    }?;

    Ok((result.0, result.1, result.2, adapter_kind.to_string()))
}

fn build_listen_params(args: &ListenerArgs) -> owhisper_interface::ListenParams {
    let redemption_time_ms = if args.onboarding { "60" } else { "400" };
    owhisper_interface::ListenParams {
        model: Some(args.model.clone()),
        languages: args.languages.clone(),
        sample_rate: super::super::SAMPLE_RATE,
        keywords: args.keywords.clone(),
        custom_query: Some(std::collections::HashMap::from([(
            "redemption_time_ms".to_string(),
            redemption_time_ms.to_string(),
        )])),
        ..Default::default()
    }
}

fn build_extra(args: &ListenerArgs) -> (f64, Extra) {
    let session_offset_secs = args.session_started_at.elapsed().as_secs_f64();
    let started_unix_millis = args
        .session_started_at_unix
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis()
        .min(u64::MAX as u128) as u64;

    let extra = Extra {
        started_unix_millis,
    };

    (session_offset_secs, extra)
}

fn build_connect_policy() -> WebSocketConnectPolicy {
    WebSocketConnectPolicy {
        connect_timeout: Duration::from_secs(5),
        max_attempts: LISTEN_CONNECT_MAX_ATTEMPTS,
        retry_delay: LISTEN_CONNECT_RETRY_DELAY,
        overall_budget: Some(LISTEN_CONNECT_BUDGET),
    }
}

fn build_connect_retry_callback(args: &ListenerArgs) -> WebSocketRetryCallback {
    let runtime = args.runtime.clone();
    let session_id = args.session_id.clone();

    Arc::new(move |event: WebSocketRetryEvent| {
        runtime.emit_progress(SessionProgressEvent::ListenerRetrying {
            session_id: session_id.clone(),
            attempt: event.attempt,
            max_attempts: event.max_attempts,
        });
    })
}

fn emit_terminal_connect_error(args: &ListenerArgs, error: &hypr_ws_client::Error) {
    args.runtime.emit_error(SessionErrorEvent::ConnectionError {
        session_id: args.session_id.clone(),
        error: error.to_string(),
        stage: ConnectionStage::InitialConnect,
        attempts: connect_attempts(error),
        max_attempts: LISTEN_CONNECT_MAX_ATTEMPTS,
        retryable: false,
    });
}

fn connect_attempts(error: &hypr_ws_client::Error) -> usize {
    match error {
        hypr_ws_client::Error::ConnectTimeout { attempt, .. }
        | hypr_ws_client::Error::ConnectFailed { attempt, .. } => *attempt,
        hypr_ws_client::Error::ConnectRetriesExhausted { attempts, .. } => *attempts,
        _ => 1,
    }
}

fn degraded_error_for_connect_failure(
    provider: &str,
    error: &hypr_ws_client::Error,
) -> DegradedError {
    match error {
        hypr_ws_client::Error::ConnectFailed { is_auth: true, .. } => {
            DegradedError::AuthenticationFailed {
                provider: provider.to_string(),
            }
        }
        hypr_ws_client::Error::ConnectRetriesExhausted {
            attempts,
            last_error,
        } => DegradedError::RetryExhausted {
            attempts: *attempts,
            last_error: last_error.clone(),
        },
        hypr_ws_client::Error::ConnectTimeout { .. } => DegradedError::ConnectionTimeout,
        _ => DegradedError::StreamError {
            message: error.to_string(),
        },
    }
}

fn actor_error_from_connect_failure(
    provider: &str,
    error: &hypr_ws_client::Error,
) -> ActorProcessingErr {
    actor_error(degraded_error_for_connect_failure(provider, error))
}

async fn spawn_rx_task_single_with_adapter<A: RealtimeSttAdapter>(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<Bytes, ControlMessage>>(32);

    let provider_name = A::default().provider_name().to_string();
    let client = owhisper_client::ListenClient::builder()
        .adapter::<A>()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .extra_header(DEVICE_FINGERPRINT_HEADER, hypr_host::fingerprint())
        .connect_policy(build_connect_policy())
        .on_connect_retry(build_connect_retry_callback(&args))
        .build_single()
        .await;

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let (listen_stream, handle) = match client.from_realtime_audio(outbound).await {
        Ok(res) => res,
        Err(error) => {
            tracing::error!(
                hyprnote.session.id = %args.session_id,
                error.message = %error,
                "listen_ws_connect_failed(single)"
            );
            emit_terminal_connect_error(&args, &error);
            return Err(actor_error_from_connect_failure(&provider_name, &error));
        }
    };

    let rx_task = tokio::spawn(async move {
        futures_util::pin_mut!(listen_stream);
        process_stream(
            listen_stream,
            handle,
            myself,
            shutdown_rx,
            session_offset_secs,
            extra,
        )
        .await;
    });

    Ok((ChannelSender::Single(tx), rx_task, shutdown_tx))
}

async fn spawn_rx_task_dual_with_adapter<A: RealtimeSttAdapter>(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<(Bytes, Bytes), ControlMessage>>(32);

    let provider_name = A::default().provider_name().to_string();
    let client = owhisper_client::ListenClient::builder()
        .adapter::<A>()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .extra_header(DEVICE_FINGERPRINT_HEADER, hypr_host::fingerprint())
        .connect_policy(build_connect_policy())
        .on_connect_retry(build_connect_retry_callback(&args))
        .build_dual()
        .await;

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let (listen_stream, handle) = match client.from_realtime_audio(outbound).await {
        Ok(res) => res,
        Err(error) => {
            tracing::error!(
                hyprnote.session.id = %args.session_id,
                error.message = %error,
                "listen_ws_connect_failed(dual)"
            );
            emit_terminal_connect_error(&args, &error);
            return Err(actor_error_from_connect_failure(&provider_name, &error));
        }
    };

    let rx_task = tokio::spawn(async move {
        futures_util::pin_mut!(listen_stream);
        process_stream(
            listen_stream,
            handle,
            myself,
            shutdown_rx,
            session_offset_secs,
            extra,
        )
        .await;
    });

    Ok((ChannelSender::Dual(tx), rx_task, shutdown_tx))
}
