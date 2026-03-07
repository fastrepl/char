use std::path::PathBuf;

use hypr_supervisor::{RestartBudget, RestartTracker, RetryStrategy, spawn_with_retry};
use ractor::concurrency::Duration;
use ractor::{Actor, ActorCell, ActorProcessingErr, ActorRef, SpawnErr, SupervisionEvent};
use tracing::Instrument;

use crate::actors::session::lifecycle;
use crate::actors::session::types::{SessionContext, session_span, session_supervisor_name};
use crate::actors::{
    ChannelMode, ListenerActor, ListenerArgs, ListenerInitError, RecArgs, RecMsg, RecorderActor,
    SourceActor, SourceArgs,
};
use crate::{
    DegradedError, RecordingMode, RecordingStatusEvent, SessionLifecycleEvent, SessionProgressEvent,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ChildKind {
    Source,
    Listener,
    Recorder,
}

const RESTART_BUDGET: RestartBudget = RestartBudget {
    max_restarts: 3,
    max_window: Duration::from_secs(15),
    reset_after: Some(Duration::from_secs(30)),
};

const RETRY_STRATEGY: RetryStrategy = RetryStrategy {
    max_attempts: 3,
    base_delay: Duration::from_millis(100),
};

pub struct SessionState {
    ctx: SessionContext,
    source_cell: Option<ActorCell>,
    listener_cell: Option<ActorCell>,
    recorder_cell: Option<ActorCell>,
    recorder_done: Option<tokio::sync::oneshot::Receiver<()>>,
    recorder_mode: Option<RecordingMode>,
    source_restarts: RestartTracker,
    recorder_restarts: RestartTracker,
    shutting_down: bool,
}

pub struct SessionActor;

#[derive(Debug)]
pub enum SessionMsg {
    Shutdown,
}

#[ractor::async_trait]
impl Actor for SessionActor {
    type Msg = SessionMsg;
    type State = SessionState;
    type Arguments = SessionContext;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        ctx: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let session_id = ctx.params.session_id.clone();
        let span = session_span(&session_id);

        async {
            let (source_ref, _) = Actor::spawn_linked(
                Some(SourceActor::name()),
                SourceActor,
                SourceArgs {
                    mic_device: None,
                    onboarding: ctx.params.onboarding,
                    runtime: ctx.runtime.clone(),
                    session_id: ctx.params.session_id.clone(),
                },
                myself.get_cell(),
            )
            .await?;

            let (recorder_cell, recorder_done) = if ctx.params.record_enabled {
                let (recorder_cell, recorder_done) = spawn_tracked_recorder(
                    myself.get_cell(),
                    ctx.app_dir.clone(),
                    ctx.params.session_id.clone(),
                )
                .await?;
                (Some(recorder_cell), Some(recorder_done))
            } else {
                (None, None)
            };
            let recorder_mode = ctx
                .params
                .record_enabled
                .then_some(RecordingMode::UserEnabled);

            Ok(SessionState {
                ctx,
                source_cell: Some(source_ref.get_cell()),
                listener_cell: None,
                recorder_cell,
                recorder_done,
                recorder_mode,
                source_restarts: RestartTracker::new(),
                recorder_restarts: RestartTracker::new(),
                shutting_down: false,
            })
        }
        .instrument(span)
        .await
    }

    // Listener is spawned in post_start so that a connection failure enters
    // degraded mode instead of killing the session -- source and recorder keep running.
    async fn post_start(
        &self,
        myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        let span = session_span(&state.ctx.params.session_id);

        async {
            state
                .ctx
                .runtime
                .emit_lifecycle(SessionLifecycleEvent::Started {
                    session_id: state.ctx.params.session_id.clone(),
                });
            emit_recording_status(state);

            let mode = ChannelMode::determine(state.ctx.params.onboarding);
            match Actor::spawn_linked(
                Some(ListenerActor::name()),
                ListenerActor,
                ListenerArgs {
                    runtime: state.ctx.runtime.clone(),
                    languages: state.ctx.params.languages.clone(),
                    onboarding: state.ctx.params.onboarding,
                    model: state.ctx.params.model.clone(),
                    base_url: state.ctx.params.base_url.clone(),
                    api_key: state.ctx.params.api_key.clone(),
                    keywords: state.ctx.params.keywords.clone(),
                    mode,
                    session_started_at: state.ctx.started_at_instant,
                    session_started_at_unix: state.ctx.started_at_system,
                    session_id: state.ctx.params.session_id.clone(),
                },
                myself.get_cell(),
            )
            .await
            {
                Ok((listener_ref, _)) => {
                    state.listener_cell = Some(listener_ref.get_cell());
                }
                Err(e) => match extract_listener_startup_error(&e) {
                    Some(degraded) => {
                        tracing::warn!(?e, "listener_spawn_failed_entering_degraded_mode");
                        enter_degraded_mode(myself.get_cell(), state, degraded).await;
                    }
                    None => {
                        tracing::error!(?e, "listener_spawn_failed_failing_session");
                        return Err(Box::new(e) as ActorProcessingErr);
                    }
                },
            }
            Ok(())
        }
        .instrument(span)
        .await
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SessionMsg::Shutdown => {
                state.shutting_down = true;

                if let Some(cell) = state.recorder_cell.take() {
                    let done = state.recorder_done.take();
                    cell.stop(Some("session_stop".to_string()));
                    wait_for_recorder_done(done).await;
                }

                if let Some(cell) = state.source_cell.take() {
                    cell.stop(Some("session_stop".to_string()));
                }
                if let Some(cell) = state.listener_cell.take() {
                    cell.stop(Some("session_stop".to_string()));
                }

                myself.stop(None);
            }
        }
        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        let span = session_span(&state.ctx.params.session_id);
        let _guard = span.enter();

        state.source_restarts.maybe_reset(&RESTART_BUDGET);
        state.recorder_restarts.maybe_reset(&RESTART_BUDGET);

        if state.shutting_down {
            return Ok(());
        }

        match message {
            SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}

            SupervisionEvent::ActorTerminated(cell, _, reason) => {
                match identify_child(state, &cell) {
                    Some(ChildKind::Listener) => {
                        tracing::info!(?reason, "listener_terminated_entering_degraded_mode");
                        let degraded = parse_degraded_reason(reason.as_ref());
                        state.listener_cell = None;
                        enter_degraded_mode(myself.get_cell(), state, degraded).await;
                    }
                    Some(ChildKind::Source) => {
                        tracing::info!(?reason, "source_terminated_attempting_restart");
                        state.source_cell = None;
                        let is_device_change = reason.as_deref() == Some("device_change");
                        if !try_restart_source(myself.get_cell(), state, !is_device_change).await {
                            tracing::error!("source_restart_limit_exceeded_meltdown");
                            meltdown(myself, state).await;
                        }
                    }
                    Some(ChildKind::Recorder) => {
                        tracing::info!(?reason, "recorder_terminated_attempting_restart");
                        state.recorder_cell = None;
                        if !try_restart_recorder(myself.get_cell(), state).await {
                            emit_recording_failure(
                                &state.ctx,
                                state.recorder_mode.unwrap_or(RecordingMode::ForcedFallback),
                                "recorder restart limit exceeded".to_string(),
                            );
                            tracing::error!("recorder_restart_limit_exceeded_meltdown");
                            meltdown(myself, state).await;
                        }
                    }
                    None => {
                        tracing::warn!("unknown_child_terminated");
                    }
                }
            }

            SupervisionEvent::ActorFailed(cell, error) => match identify_child(state, &cell) {
                Some(ChildKind::Listener) => {
                    tracing::info!(?error, "listener_failed_entering_degraded_mode");
                    let degraded =
                        extract_listener_init_error(error.as_ref()).unwrap_or_else(|| {
                            DegradedError::StreamError {
                                message: error.to_string(),
                            }
                        });
                    state.listener_cell = None;
                    enter_degraded_mode(myself.get_cell(), state, degraded).await;
                }
                Some(ChildKind::Source) => {
                    tracing::warn!(?error, "source_failed_attempting_restart");
                    state.source_cell = None;
                    if !try_restart_source(myself.get_cell(), state, true).await {
                        tracing::error!("source_restart_limit_exceeded_meltdown");
                        meltdown(myself, state).await;
                    }
                }
                Some(ChildKind::Recorder) => {
                    tracing::warn!(?error, "recorder_failed_attempting_restart");
                    state.recorder_cell = None;
                    if !try_restart_recorder(myself.get_cell(), state).await {
                        tracing::error!("recorder_restart_limit_exceeded_meltdown");
                        meltdown(myself, state).await;
                    }
                }
                None => {
                    tracing::warn!("unknown_child_failed");
                }
            },
        }
        Ok(())
    }
}

fn identify_child(state: &SessionState, cell: &ActorCell) -> Option<ChildKind> {
    if state
        .source_cell
        .as_ref()
        .is_some_and(|c| c.get_id() == cell.get_id())
    {
        return Some(ChildKind::Source);
    }
    if state
        .listener_cell
        .as_ref()
        .is_some_and(|c| c.get_id() == cell.get_id())
    {
        return Some(ChildKind::Listener);
    }
    if state
        .recorder_cell
        .as_ref()
        .is_some_and(|c| c.get_id() == cell.get_id())
    {
        return Some(ChildKind::Recorder);
    }
    None
}

fn emit_recording_status(state: &SessionState) {
    let session_id = state.ctx.params.session_id.clone();
    let event = match state.recorder_mode {
        Some(mode) if state.recorder_cell.is_some() => {
            RecordingStatusEvent::Enabled { session_id, mode }
        }
        Some(mode) => RecordingStatusEvent::Failed {
            session_id,
            mode,
            error: "recorder unavailable".to_string(),
        },
        None => RecordingStatusEvent::Disabled { session_id },
    };
    state.ctx.runtime.emit_recording(event);
}

fn emit_recording_failure(ctx: &SessionContext, mode: RecordingMode, error: String) {
    ctx.runtime.emit_recording(RecordingStatusEvent::Failed {
        session_id: ctx.params.session_id.clone(),
        mode,
        error,
    });
}

async fn enter_degraded_mode(
    supervisor_cell: ActorCell,
    state: &mut SessionState,
    degraded: DegradedError,
) {
    let recorder_result = ensure_recorder_running(supervisor_cell, state, true).await;

    if let Err(error) = recorder_result {
        tracing::error!(
            session_id = %state.ctx.params.session_id,
            error,
            "failed_to_force_enable_recorder_for_degraded_session"
        );
    }

    state
        .ctx
        .runtime
        .emit_progress(SessionProgressEvent::ListenerDegraded {
            session_id: state.ctx.params.session_id.clone(),
            error: degraded,
        });
}

async fn try_restart_source(
    supervisor_cell: ActorCell,
    state: &mut SessionState,
    count_against_budget: bool,
) -> bool {
    if count_against_budget && !state.source_restarts.record_restart(&RESTART_BUDGET) {
        return false;
    }

    let sup = supervisor_cell;
    let onboarding = state.ctx.params.onboarding;
    let runtime = state.ctx.runtime.clone();
    let session_id = state.ctx.params.session_id.clone();

    let cell = spawn_with_retry(&RETRY_STRATEGY, || {
        let sup = sup.clone();
        let runtime = runtime.clone();
        let session_id = session_id.clone();
        async move {
            let (r, _) = Actor::spawn_linked(
                Some(SourceActor::name()),
                SourceActor,
                SourceArgs {
                    mic_device: None,
                    onboarding,
                    runtime,
                    session_id,
                },
                sup,
            )
            .await?;
            Ok(r.get_cell())
        }
    })
    .await;

    match cell {
        Some(c) => {
            state.source_cell = Some(c);
            true
        }
        None => false,
    }
}

async fn ensure_recorder_running(
    supervisor_cell: ActorCell,
    state: &mut SessionState,
    force_enable: bool,
) -> Result<(), String> {
    let previous_mode = state.recorder_mode;

    if force_enable && state.recorder_mode.is_none() {
        tracing::info!(
            session_id = %state.ctx.params.session_id,
            "forcing_recorder_for_degraded_session"
        );
        state.recorder_mode = Some(RecordingMode::ForcedFallback);
    }

    if state.recorder_mode.is_none() || state.recorder_cell.is_some() {
        return Ok(());
    }

    match spawn_recorder_with_retry(
        supervisor_cell,
        state.ctx.app_dir.clone(),
        state.ctx.params.session_id.clone(),
    )
    .await
    {
        Some((cell, done)) => {
            attach_recorder(state, cell, done);
            if previous_mode.is_none() {
                emit_recording_status(state);
            }
            Ok(())
        }
        None => {
            let mode = state.recorder_mode.unwrap_or(RecordingMode::ForcedFallback);
            emit_recording_failure(&state.ctx, mode, "failed to start recorder".to_string());
            Err("failed to start recorder".to_string())
        }
    }
}

async fn try_restart_recorder(supervisor_cell: ActorCell, state: &mut SessionState) -> bool {
    if state.recorder_mode.is_none() {
        return true;
    }

    if !state.recorder_restarts.record_restart(&RESTART_BUDGET) {
        return false;
    }

    match spawn_recorder_with_retry(
        supervisor_cell,
        state.ctx.app_dir.clone(),
        state.ctx.params.session_id.clone(),
    )
    .await
    {
        Some((cell, done)) => {
            attach_recorder(state, cell, done);
            true
        }
        None => false,
    }
}

fn attach_recorder(
    state: &mut SessionState,
    recorder_cell: ActorCell,
    recorder_done: tokio::sync::oneshot::Receiver<()>,
) {
    state.recorder_cell = Some(recorder_cell);
    state.recorder_done = Some(recorder_done);
}

async fn spawn_tracked_recorder(
    supervisor_cell: ActorCell,
    app_dir: PathBuf,
    session_id: String,
) -> Result<(ActorCell, tokio::sync::oneshot::Receiver<()>), SpawnErr> {
    let (done_tx, done_rx) = tokio::sync::oneshot::channel();
    let recorder_cell = spawn_recorder(supervisor_cell, app_dir, session_id, Some(done_tx)).await?;
    Ok((recorder_cell, done_rx))
}

async fn spawn_recorder(
    supervisor_cell: ActorCell,
    app_dir: PathBuf,
    session_id: String,
    done_tx: Option<tokio::sync::oneshot::Sender<()>>,
) -> Result<ActorCell, SpawnErr> {
    let (recorder_ref, _): (ActorRef<RecMsg>, _) = Actor::spawn_linked(
        Some(RecorderActor::name()),
        RecorderActor::new(),
        RecArgs {
            app_dir,
            session_id,
            done_tx,
        },
        supervisor_cell,
    )
    .await?;

    Ok(recorder_ref.get_cell())
}

async fn spawn_recorder_with_retry(
    supervisor_cell: ActorCell,
    app_dir: PathBuf,
    session_id: String,
) -> Option<(ActorCell, tokio::sync::oneshot::Receiver<()>)> {
    for attempt in 0..RETRY_STRATEGY.max_attempts {
        let delay = RETRY_STRATEGY.base_delay * 2u32.pow(attempt);
        tokio::time::sleep(delay).await;

        match spawn_tracked_recorder(supervisor_cell.clone(), app_dir.clone(), session_id.clone())
            .await
        {
            Ok(recorder) => {
                tracing::info!(attempt, "spawn_retry_succeeded");
                return Some(recorder);
            }
            Err(error) => {
                tracing::warn!(attempt, error.message = ?error, "spawn_retry_failed");
            }
        }
    }

    None
}

async fn meltdown(myself: ActorRef<SessionMsg>, state: &mut SessionState) {
    state.shutting_down = true;

    if let Some(cell) = state.source_cell.take() {
        cell.stop(Some("meltdown".to_string()));
    }
    if let Some(cell) = state.listener_cell.take() {
        cell.stop(Some("meltdown".to_string()));
    }
    if let Some(cell) = state.recorder_cell.take() {
        let done = state.recorder_done.take();
        cell.stop(Some("meltdown".to_string()));
        wait_for_recorder_done(done).await;
    }
    myself.stop(Some("restart_limit_exceeded".to_string()));
}

async fn wait_for_recorder_done(done: Option<tokio::sync::oneshot::Receiver<()>>) {
    match done {
        Some(rx) => {
            tokio::time::timeout(Duration::from_secs(30), rx).await.ok();
        }
        None => {
            lifecycle::wait_for_actor_shutdown(RecorderActor::name()).await;
        }
    }
}

fn extract_listener_init_error(error: &(dyn std::error::Error + 'static)) -> Option<DegradedError> {
    error
        .downcast_ref::<ListenerInitError>()
        .map(|error| error.degraded_error().clone())
}

fn extract_listener_startup_error(error: &SpawnErr) -> Option<DegradedError> {
    match error {
        SpawnErr::StartupFailed(inner) => extract_listener_init_error(inner.as_ref()),
        _ => None,
    }
}

fn parse_degraded_reason(reason: Option<&String>) -> DegradedError {
    reason
        .and_then(|r| serde_json::from_str::<DegradedError>(r).ok())
        .unwrap_or_else(|| DegradedError::StreamError {
            message: reason
                .cloned()
                .unwrap_or_else(|| "listener terminated without reason".to_string()),
        })
}

pub async fn spawn_session_supervisor(
    ctx: SessionContext,
) -> Result<(ActorCell, tokio::task::JoinHandle<()>), ActorProcessingErr> {
    let supervisor_name = session_supervisor_name(&ctx.params.session_id);
    let (actor_ref, handle) = Actor::spawn(Some(supervisor_name), SessionActor, ctx).await?;
    Ok((actor_ref.get_cell(), handle))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actors::ListenerInitError;
    use ractor::{ActorProcessingErr, ActorRef, SpawnErr};

    struct TestSupervisor;

    #[ractor::async_trait]
    impl Actor for TestSupervisor {
        type Msg = ();
        type State = ();
        type Arguments = ();

        async fn pre_start(
            &self,
            _myself: ActorRef<Self::Msg>,
            _args: Self::Arguments,
        ) -> Result<Self::State, ActorProcessingErr> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn spawn_recorder_with_retry_returns_completion_receiver() {
        let (supervisor_ref, supervisor_handle) = Actor::spawn(None, TestSupervisor, ())
            .await
            .expect("failed to spawn test supervisor");
        let app_dir = std::env::temp_dir().join(format!("listener-core-{}", uuid::Uuid::new_v4()));

        std::fs::create_dir_all(&app_dir).expect("failed to create test app dir");

        let (recorder_cell, done_rx) = spawn_recorder_with_retry(
            supervisor_ref.get_cell(),
            app_dir.clone(),
            format!("session-{}", uuid::Uuid::new_v4()),
        )
        .await
        .expect("expected recorder spawn to succeed");

        recorder_cell.stop(Some("test_stop".to_string()));
        tokio::time::timeout(Duration::from_secs(5), done_rx)
            .await
            .expect("timed out waiting for recorder completion")
            .expect("recorder completion channel was dropped");

        supervisor_ref.stop(None);
        let _ = supervisor_handle.await;
        let _ = std::fs::remove_dir_all(app_dir);
    }

    #[test]
    fn parse_degraded_reason_uses_json_payload() {
        let reason = serde_json::to_string(&DegradedError::ConnectionTimeout).unwrap();
        let parsed = parse_degraded_reason(Some(&reason));
        assert!(matches!(parsed, DegradedError::ConnectionTimeout));
    }

    #[test]
    fn parse_degraded_reason_falls_back_for_missing_reason() {
        let parsed = parse_degraded_reason(None);
        assert!(matches!(parsed, DegradedError::StreamError { .. }));
    }

    #[test]
    fn parse_degraded_reason_falls_back_for_invalid_json() {
        let reason = "not-json".to_string();
        let parsed = parse_degraded_reason(Some(&reason));
        assert!(matches!(parsed, DegradedError::StreamError { .. }));
    }

    #[test]
    fn extract_listener_startup_error_uses_typed_degraded_payload() {
        let error = SpawnErr::StartupFailed(Box::new(ListenerInitError::new(
            DegradedError::RetryExhausted {
                attempts: 3,
                last_error: "HTTP 503 (overloaded)".to_string(),
            },
        )));

        let parsed = extract_listener_startup_error(&error);
        assert!(matches!(
            parsed,
            Some(DegradedError::RetryExhausted { attempts: 3, .. })
        ));
    }

    #[test]
    fn extract_listener_startup_error_ignores_untyped_failure() {
        let error = SpawnErr::StartupFailed("listener startup failed".into());
        let parsed = extract_listener_startup_error(&error);
        assert!(parsed.is_none());
    }

    #[test]
    fn extract_listener_init_error_uses_typed_actor_error() {
        let error = ListenerInitError::new(DegradedError::ConnectionTimeout);
        let parsed = extract_listener_init_error(&error);
        assert!(matches!(parsed, Some(DegradedError::ConnectionTimeout)));
    }
}
