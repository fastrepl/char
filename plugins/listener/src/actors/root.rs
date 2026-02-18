use std::time::{Instant, SystemTime};

use ractor::{Actor, ActorCell, ActorProcessingErr, ActorRef, RpcReplyPort, SupervisionEvent};
use tauri_plugin_settings::SettingsPluginExt;
use tauri_specta::Event;
use tracing::Instrument;

use crate::SessionLifecycleEvent;
use crate::actors::session::lifecycle::{
    clear_sentry_session_context, configure_sentry_session_context, emit_session_ended,
};
use crate::actors::{
    SessionContext, SessionMsg, SessionParams, session_span, spawn_session_supervisor,
};

pub enum RootMsg {
    StartSession(SessionParams, RpcReplyPort<bool>),
    StopSession(RpcReplyPort<()>),
    GetState(RpcReplyPort<crate::State>),
}

pub struct RootArgs {
    pub app: tauri::AppHandle,
}

pub struct RootState {
    app: tauri::AppHandle,
    session_id: Option<String>,
    supervisor: Option<ActorCell>,
    finalizing: bool,
}

pub struct RootActor;

impl RootActor {
    pub fn name() -> ractor::ActorName {
        "listener_root_actor".into()
    }
}

#[ractor::async_trait]
impl Actor for RootActor {
    type Msg = RootMsg;
    type State = RootState;
    type Arguments = RootArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        Ok(RootState {
            app: args.app,
            session_id: None,
            supervisor: None,
            finalizing: false,
        })
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            RootMsg::StartSession(params, reply) => {
                let success = start_session_impl(myself.get_cell(), params, state).await;
                let _ = reply.send(success);
            }
            RootMsg::StopSession(reply) => {
                stop_session_impl(state).await;
                let _ = reply.send(());
            }
            RootMsg::GetState(reply) => {
                let fsm_state = if state.finalizing {
                    crate::State::Finalizing
                } else if state.supervisor.is_some() {
                    crate::State::Active
                } else {
                    crate::State::Inactive
                };
                let _ = reply.send(fsm_state);
            }
        }
        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}
            SupervisionEvent::ActorTerminated(cell, _, reason) => {
                if let Some(supervisor) = &state.supervisor
                    && cell.get_id() == supervisor.get_id()
                {
                    let session_id = state.session_id.take().unwrap_or_default();
                    let span = session_span(&session_id);
                    let _guard = span.enter();
                    tracing::info!(?reason, "session_supervisor_terminated");
                    state.supervisor = None;
                    state.finalizing = false;

                    emit_session_ended(&state.app, &session_id, reason);
                }
            }
            SupervisionEvent::ActorFailed(cell, error) => {
                if let Some(supervisor) = &state.supervisor
                    && cell.get_id() == supervisor.get_id()
                {
                    let session_id = state.session_id.take().unwrap_or_default();
                    let span = session_span(&session_id);
                    let _guard = span.enter();
                    tracing::warn!(?error, "session_supervisor_failed");
                    state.supervisor = None;
                    state.finalizing = false;
                    emit_session_ended(&state.app, &session_id, Some(format!("{:?}", error)));
                }
            }
        }
        Ok(())
    }
}

async fn start_session_impl(
    root_cell: ActorCell,
    params: SessionParams,
    state: &mut RootState,
) -> bool {
    let session_id = params.session_id.clone();
    let span = session_span(&session_id);

    async {
        if state.supervisor.is_some() {
            tracing::warn!("session_already_running");
            return false;
        }

        configure_sentry_session_context(&params);

        let app_dir = match state.app.settings().cached_vault_base() {
            Ok(base) => base.join("sessions").into_std_path_buf(),
            Err(e) => {
                tracing::error!(error = ?e, "failed_to_resolve_sessions_base_dir");
                clear_sentry_session_context();
                return false;
            }
        };

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.app.tray().set_start_disabled(true);
        }

        let ctx = SessionContext {
            app: state.app.clone(),
            params: params.clone(),
            app_dir,
            started_at_instant: Instant::now(),
            started_at_system: SystemTime::now(),
        };

        match spawn_session_supervisor(ctx).await {
            Ok((supervisor_cell, _handle)) => {
                supervisor_cell.link(root_cell);

                state.session_id = Some(params.session_id.clone());
                state.supervisor = Some(supervisor_cell);

                if let Err(error) = (SessionLifecycleEvent::Active {
                    session_id: params.session_id,
                    error: None,
                })
                .emit(&state.app)
                {
                    tracing::error!(?error, "failed_to_emit_active");
                }

                tracing::info!("session_started");
                true
            }
            Err(e) => {
                tracing::error!(error = ?e, "failed_to_start_session");
                clear_sentry_session_context();

                use tauri_plugin_tray::TrayPluginExt;
                let _ = state.app.tray().set_start_disabled(false);
                false
            }
        }
    }
    .instrument(span)
    .await
}

async fn stop_session_impl(state: &mut RootState) {
    if let Some(supervisor) = &state.supervisor {
        state.finalizing = true;

        if let Some(session_id) = &state.session_id {
            let span = session_span(session_id);
            let _guard = span.enter();
            tracing::info!("session_finalizing");

            if let Err(error) = (SessionLifecycleEvent::Finalizing {
                session_id: session_id.clone(),
            })
            .emit(&state.app)
            {
                tracing::error!(?error, "failed_to_emit_finalizing");
            }
        }

        let session_ref: ActorRef<SessionMsg> = supervisor.clone().into();
        if let Err(error) = session_ref.cast(SessionMsg::Shutdown) {
            tracing::warn!(
                ?error,
                "failed_to_cast_session_shutdown_falling_back_to_stop"
            );
            supervisor.stop(Some("session_stop_cast_failed".to_string()));
        }
    }
}
