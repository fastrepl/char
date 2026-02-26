use tauri::{AppHandle, Manager, Runtime};
use tokio_util::sync::CancellationToken;

use crate::{
    DetectEvent, ProcessorState,
    env::{Env, TauriEnv},
    mic_usage_tracker,
    policy::{MicEventType, PolicyContext},
};

pub fn setup<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let env = TauriEnv {
        app_handle: app.app_handle().clone(),
    };
    let processor = app.state::<ProcessorState>().inner().clone();

    let callback = hypr_detect::new_callback(move |event| {
        let env = env.clone();
        let processor = processor.clone();
        tauri::async_runtime::spawn(async move {
            handle_detect_event(&env, &processor, event);
        });
    });

    let detector_state = app.state::<crate::DetectorState>();
    let mut detector = detector_state.lock().unwrap_or_else(|e| e.into_inner());
    detector.start(callback);
    drop(detector);

    Ok(())
}

pub(crate) fn handle_detect_event<E: Env>(
    env: &E,
    state: &ProcessorState,
    event: hypr_detect::DetectEvent,
) {
    match event {
        hypr_detect::DetectEvent::MicStarted(apps) => {
            if !env.is_detect_enabled() {
                return;
            }
            handle_mic_started(env, state, apps);
        }
        hypr_detect::DetectEvent::MicStopped(apps) => {
            if !env.is_detect_enabled() {
                return;
            }
            handle_mic_stopped(env, state, apps);
        }
        #[cfg(all(target_os = "macos", feature = "zoom"))]
        hypr_detect::DetectEvent::ZoomMuteStateChanged { value } => {
            env.emit(DetectEvent::MicMuteStateChanged { value });
        }
        #[cfg(all(target_os = "macos", feature = "sleep"))]
        hypr_detect::DetectEvent::SleepStateChanged { value } => {
            env.emit(DetectEvent::SleepStateChanged { value });
        }
    }
}

fn handle_mic_started<E: Env>(
    env: &E,
    state: &ProcessorState,
    apps: Vec<hypr_detect::InstalledApp>,
) {
    let mut guard = state.lock().unwrap_or_else(|e| e.into_inner());

    let to_track: Vec<_> = apps
        .iter()
        .filter(|app| {
            guard.policy.should_track_app(&app.id)
                && !guard.mic_usage_tracker.is_tracking(&app.id)
                && !guard.mic_usage_tracker.is_in_cooldown(&app.id)
        })
        .cloned()
        .collect();

    let threshold_secs = guard.mic_active_threshold_secs;

    for app in &to_track {
        let token = CancellationToken::new();
        let generation = guard
            .mic_usage_tracker
            .start_tracking(app.id.clone(), token.clone());
        mic_usage_tracker::spawn_timer(
            env.clone(),
            state.clone(),
            app.clone(),
            generation,
            token,
            threshold_secs,
        );
    }
}

fn handle_mic_stopped<E: Env>(
    env: &E,
    state: &ProcessorState,
    apps: Vec<hypr_detect::InstalledApp>,
) {
    let is_dnd = env.is_do_not_disturb();

    let policy_result = {
        let mut guard = state.lock().unwrap_or_else(|e| e.into_inner());

        for app in &apps {
            guard.mic_usage_tracker.cancel_app(&app.id);
        }

        let ctx = PolicyContext {
            apps: &apps,
            is_dnd,
            event_type: MicEventType::Stopped,
        };
        guard.policy.evaluate(&ctx)
    };

    match policy_result {
        Ok(result) => {
            env.emit(DetectEvent::MicStopped {
                apps: result.filtered_apps,
            });
        }
        Err(reason) => {
            tracing::info!(?reason, "skip_mic_stopped");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::env::test_support::TestEnv;
    use std::time::Duration;

    fn zoom() -> hypr_detect::InstalledApp {
        hypr_detect::InstalledApp {
            id: "us.zoom.xos".to_string(),
            name: "zoom.us".to_string(),
        }
    }

    fn aqua_voice() -> hypr_detect::InstalledApp {
        hypr_detect::InstalledApp {
            id: "com.electron.aqua-voice".to_string(),
            name: "Aqua Voice".to_string(),
        }
    }

    fn slack() -> hypr_detect::InstalledApp {
        hypr_detect::InstalledApp {
            id: "com.tinyspeck.slackmacgap".to_string(),
            name: "Slack".to_string(),
        }
    }

    struct Harness {
        env: TestEnv,
        state: ProcessorState,
    }

    impl Harness {
        fn new() -> Self {
            Self {
                env: TestEnv::new(),
                state: ProcessorState::default(),
            }
        }

        fn mic_started(&self, app: hypr_detect::InstalledApp) {
            handle_detect_event(
                &self.env,
                &self.state,
                hypr_detect::DetectEvent::MicStarted(vec![app]),
            );
        }

        fn mic_stopped(&self, app: hypr_detect::InstalledApp) {
            handle_detect_event(
                &self.env,
                &self.state,
                hypr_detect::DetectEvent::MicStopped(vec![app]),
            );
        }

        async fn settle(&self) {
            for _ in 0..100 {
                tokio::task::yield_now().await;
            }
        }

        async fn advance_secs(&self, secs: u64) {
            self.settle().await;
            tokio::time::advance(Duration::from_secs(secs)).await;
            self.settle().await;
        }

        fn take_events(&self) -> Vec<DetectEvent> {
            std::mem::take(&mut self.env.events.lock().unwrap())
        }
    }

    #[tokio::test(start_paused = true)]
    async fn test_mic_detected_after_delay() {
        let h = Harness::new();

        h.mic_started(zoom());
        assert!(h.take_events().is_empty(), "nothing emitted immediately");

        h.advance_secs(15).await;

        let events = h.take_events();
        assert_eq!(events.len(), 1, "expected one MicDetected event");
        assert!(
            matches!(
                &events[0],
                DetectEvent::MicDetected { apps, duration_secs, .. }
                    if apps[0].id == "us.zoom.xos" && *duration_secs == 15
            ),
            "expected MicDetected with zoom app and duration_secs=15"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_filtered_app_no_event() {
        let h = Harness::new();

        h.mic_started(aqua_voice());
        assert!(
            h.take_events().is_empty(),
            "categorized app should not start a timer"
        );

        h.advance_secs(15).await;
        assert!(
            h.take_events().is_empty(),
            "categorized app should not emit MicDetected"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_cancel_before_timer() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(3).await;
        h.mic_stopped(zoom());
        h.take_events();

        h.advance_secs(15).await;

        assert!(
            h.take_events().is_empty(),
            "cancelled timer should not emit"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_user_ignored_app_no_timer() {
        let h = Harness::new();

        {
            let mut guard = h.state.lock().unwrap();
            guard
                .policy
                .user_ignored_bundle_ids
                .insert("us.zoom.xos".to_string());
        }

        h.mic_started(zoom());
        assert!(
            h.take_events().is_empty(),
            "user-ignored app should not start a timer"
        );

        h.advance_secs(15).await;
        assert!(
            h.take_events().is_empty(),
            "user-ignored app should not trigger timer"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_full_scenario_zoom_and_dictation() {
        let h = Harness::new();

        h.mic_started(zoom());
        assert!(h.take_events().is_empty(), "nothing emitted immediately");

        h.mic_started(aqua_voice());
        assert!(
            h.take_events().is_empty(),
            "dictation app should be filtered"
        );

        h.mic_stopped(aqua_voice());
        assert!(
            h.take_events().is_empty(),
            "dictation app stop should be filtered"
        );

        h.advance_secs(15).await;
        let events = h.take_events();
        assert_eq!(events.len(), 1, "zoom MicDetected should fire");
        assert!(matches!(&events[0], DetectEvent::MicDetected { .. }));

        h.mic_stopped(zoom());
        assert_eq!(h.take_events().len(), 1, "zoom should emit MicStopped");
    }

    #[tokio::test(start_paused = true)]
    async fn test_dnd_suppresses_mic_detected() {
        let h = Harness::new();
        h.env.set_dnd(true);
        {
            let mut guard = h.state.lock().unwrap();
            guard.policy.respect_dnd = true;
        }

        h.mic_started(zoom());
        assert!(h.take_events().is_empty(), "nothing emitted immediately");

        h.advance_secs(15).await;
        assert!(
            h.take_events().is_empty(),
            "DnD should suppress MicDetected at emit time"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_stop_and_restart_creates_new_timer() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(3).await;
        h.mic_stopped(zoom());
        h.take_events();

        h.mic_started(zoom());

        h.advance_secs(10).await;
        assert!(
            h.take_events().is_empty(),
            "new timer should not have fired yet (only 10s since restart)"
        );

        h.advance_secs(5).await;
        let events = h.take_events();
        assert_eq!(events.len(), 1, "timer should fire 15s after restart");
        assert!(matches!(
            &events[0],
            DetectEvent::MicDetected { apps, .. } if apps[0].id == "us.zoom.xos"
        ));
    }

    #[tokio::test(start_paused = true)]
    async fn test_duplicate_mic_started_no_timer_reset() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(10).await;
        h.mic_started(zoom());

        h.advance_secs(5).await;
        let events = h.take_events();
        assert_eq!(
            events.len(),
            1,
            "timer fires 15s from original start, not from duplicate"
        );
        assert!(matches!(&events[0], DetectEvent::MicDetected { .. }));
    }

    #[tokio::test(start_paused = true)]
    async fn test_multiple_apps_independent_timers() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(3).await;
        h.mic_started(slack());

        h.mic_stopped(zoom());
        h.take_events();

        h.advance_secs(10).await;
        assert!(
            h.take_events().is_empty(),
            "zoom cancelled, slack not yet at 15s"
        );

        h.advance_secs(5).await;
        let events = h.take_events();
        assert_eq!(events.len(), 1, "only slack timer should fire");
        assert!(matches!(
            &events[0],
            DetectEvent::MicDetected { apps, .. }
                if apps[0].id == "com.tinyspeck.slackmacgap"
        ));
    }

    #[tokio::test(start_paused = true)]
    async fn test_ignore_during_active_tracking_cancels_timer() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(3).await;

        {
            let mut guard = h.state.lock().unwrap();
            guard.mic_usage_tracker.cancel_app("us.zoom.xos");
            guard
                .policy
                .user_ignored_bundle_ids
                .insert("us.zoom.xos".to_string());
        }

        h.advance_secs(15).await;
        assert!(
            h.take_events().is_empty(),
            "timer should be cancelled when app is added to ignore list"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_cooldown_suppresses_repeated_notifications() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(15).await;
        assert_eq!(h.take_events().len(), 1, "first notification should fire");

        h.mic_stopped(zoom());
        h.take_events();
        h.mic_started(zoom());

        h.advance_secs(15).await;
        assert!(
            h.take_events().is_empty(),
            "second notification suppressed by cooldown"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_cooldown_expires_after_ten_minutes() {
        let h = Harness::new();

        h.mic_started(zoom());

        h.advance_secs(15).await;
        assert_eq!(h.take_events().len(), 1, "first notification fires");

        h.mic_stopped(zoom());
        h.take_events();

        h.advance_secs(60 * 10).await;

        h.mic_started(zoom());

        h.advance_secs(15).await;
        let events = h.take_events();
        assert_eq!(
            events.len(),
            1,
            "notification fires again after cooldown expires"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_cooldown_is_per_app() {
        let h = Harness::new();

        h.mic_started(zoom());
        h.advance_secs(15).await;
        assert_eq!(h.take_events().len(), 1, "zoom notification fires");

        h.mic_started(slack());
        h.advance_secs(15).await;
        let events = h.take_events();
        assert_eq!(
            events.len(),
            1,
            "slack notification fires despite zoom cooldown"
        );
        assert!(matches!(
            &events[0],
            DetectEvent::MicDetected { apps, .. }
                if apps[0].id == "com.tinyspeck.slackmacgap"
        ));
    }
}
