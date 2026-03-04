use std::collections::BTreeMap;

use super::SessionParams;
use super::session_span;
use crate::{ListenerRuntime, SessionLifecycleEvent};

pub(crate) fn configure_sentry_session_context(params: &SessionParams) {
    sentry::configure_scope(|scope| {
        scope.set_tag("session_id", &params.session_id);
        scope.set_tag(
            "session_type",
            if params.onboarding {
                "onboarding"
            } else {
                "production"
            },
        );

        let mut session_context = BTreeMap::new();
        session_context.insert("session_id".to_string(), params.session_id.clone().into());
        session_context.insert("model".to_string(), params.model.clone().into());
        session_context.insert("record_enabled".to_string(), params.record_enabled.into());
        session_context.insert("onboarding".to_string(), params.onboarding.into());
        session_context.insert(
            "languages".to_string(),
            format!("{:?}", params.languages).into(),
        );
        scope.set_context("session", sentry::protocol::Context::Other(session_context));
    });
}

pub(crate) fn clear_sentry_session_context() {
    sentry::configure_scope(|scope| {
        scope.remove_tag("session_id");
        scope.remove_tag("session_type");
        scope.remove_context("session");
    });
}

pub(crate) fn emit_session_ended(
    runtime: &dyn ListenerRuntime,
    session_id: &str,
    failure_reason: Option<String>,
) {
    let span = session_span(session_id);
    let _guard = span.enter();

    runtime.emit_lifecycle(SessionLifecycleEvent::Inactive {
        session_id: session_id.to_string(),
        error: failure_reason.clone(),
    });

    if let Some(reason) = failure_reason {
        tracing::info!(failure_reason = %reason, "session_stopped");
    } else {
        tracing::info!("session_stopped");
    }

    clear_sentry_session_context();
}

pub(crate) async fn wait_for_actor_shutdown(actor_name: ractor::ActorName) {
    for _ in 0..50 {
        if ractor::registry::where_is(actor_name.clone()).is_none() {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
}
