use std::collections::HashMap;
use std::time::Duration;

use tokio_util::sync::CancellationToken;

use crate::{DetectEvent, ProcessorState, env::Env};

pub(crate) const DEFAULT_MIC_ACTIVE_THRESHOLD_SECS: u64 = 15;
pub(crate) const COOLDOWN_DURATION: Duration = Duration::from_mins(10);

struct TimerEntry {
    generation: u64,
    token: CancellationToken,
}

#[derive(Default)]
pub struct MicUsageTracker {
    timers: HashMap<String, TimerEntry>,
    cooldowns: HashMap<String, tokio::time::Instant>,
    next_gen: u64,
}

impl Drop for MicUsageTracker {
    fn drop(&mut self) {
        for (_, entry) in self.timers.drain() {
            entry.token.cancel();
        }
    }
}

impl MicUsageTracker {
    pub fn is_tracking(&self, app_id: &str) -> bool {
        self.timers.contains_key(app_id)
    }

    pub fn is_in_cooldown(&mut self, app_id: &str) -> bool {
        match self.cooldowns.get(app_id) {
            Some(&fired_at) => {
                if tokio::time::Instant::now().duration_since(fired_at) < COOLDOWN_DURATION {
                    true
                } else {
                    self.cooldowns.remove(app_id);
                    false
                }
            }
            None => false,
        }
    }

    pub fn start_tracking(&mut self, app_id: String, token: CancellationToken) -> u64 {
        let generation = self.next_gen;
        self.next_gen += 1;
        if let Some(old) = self.timers.insert(app_id, TimerEntry { generation, token }) {
            old.token.cancel();
        }
        generation
    }

    pub fn cancel_app(&mut self, app_id: &str) {
        if let Some(entry) = self.timers.remove(app_id) {
            entry.token.cancel();
            tracing::info!(app_id = %app_id, "cancelled_mic_active_timer");
        }
    }

    /// Removes the timer entry only if the generation matches,
    /// preventing a stale timer from claiming an entry replaced by a newer one.
    /// On success, sets a cooldown so the same app won't be re-tracked for a while.
    pub fn claim(&mut self, app_id: &str, generation: u64) -> bool {
        match self.timers.get(app_id) {
            Some(entry) if entry.generation == generation => {
                self.timers.remove(app_id);
                self.cooldowns
                    .insert(app_id.to_string(), tokio::time::Instant::now());
                true
            }
            _ => false,
        }
    }
}

pub(crate) fn spawn_timer<E: Env>(
    env: E,
    state: ProcessorState,
    app: hypr_detect::InstalledApp,
    generation: u64,
    token: CancellationToken,
    threshold_secs: u64,
) {
    let duration = Duration::from_secs(threshold_secs);
    let app_id = app.id.clone();

    tokio::spawn(async move {
        tokio::select! {
            _ = tokio::time::sleep(duration) => {}
            _ = token.cancelled() => { return; }
        }

        let emit_event = {
            let mut guard = state.lock().unwrap_or_else(|e| e.into_inner());
            if !guard.mic_usage_tracker.claim(&app_id, generation) {
                None
            } else if guard.policy.respect_dnd && env.is_do_not_disturb() {
                tracing::info!(app_id = %app_id, "skip_mic_detected: DoNotDisturb");
                None
            } else {
                let key = uuid::Uuid::new_v4().to_string();
                Some(DetectEvent::MicDetected {
                    key,
                    apps: vec![app.clone()],
                    duration_secs: threshold_secs,
                })
            }
        };

        if let Some(event) = emit_event {
            tracing::info!(app_id = %app.id, threshold_secs, "mic_detected");
            env.emit(event);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claim_matching_generation() {
        let _rt = tokio::runtime::Runtime::new().unwrap();
        let _guard = _rt.enter();

        let mut tracker = MicUsageTracker::default();
        let token = CancellationToken::new();
        let generation = tracker.start_tracking("app.x".to_string(), token);

        assert!(tracker.claim("app.x", generation));
        assert!(!tracker.is_tracking("app.x"));
    }

    #[test]
    fn test_claim_stale_generation_rejected() {
        let _rt = tokio::runtime::Runtime::new().unwrap();
        let _guard = _rt.enter();

        let mut tracker = MicUsageTracker::default();

        let generation_0 = tracker.start_tracking("app.x".to_string(), CancellationToken::new());
        let generation_1 = tracker.start_tracking("app.x".to_string(), CancellationToken::new());

        assert!(!tracker.claim("app.x", generation_0));
        assert!(tracker.is_tracking("app.x"));

        assert!(tracker.claim("app.x", generation_1));
        assert!(!tracker.is_tracking("app.x"));
    }

    #[test]
    fn test_claim_after_cancel_returns_false() {
        let _rt = tokio::runtime::Runtime::new().unwrap();
        let _guard = _rt.enter();

        let mut tracker = MicUsageTracker::default();
        let generation = tracker.start_tracking("app.x".to_string(), CancellationToken::new());

        tracker.cancel_app("app.x");
        assert!(!tracker.claim("app.x", generation));
    }

    #[test]
    fn test_start_tracking_cancels_old_token() {
        let mut tracker = MicUsageTracker::default();
        let token1 = CancellationToken::new();
        let token1_clone = token1.clone();

        tracker.start_tracking("app.x".to_string(), token1);
        assert!(!token1_clone.is_cancelled());

        tracker.start_tracking("app.x".to_string(), CancellationToken::new());
        assert!(token1_clone.is_cancelled());
    }

    #[tokio::test(start_paused = true)]
    async fn test_cooldown_blocks_retracking() {
        let mut tracker = MicUsageTracker::default();

        let generation = tracker.start_tracking("app.x".to_string(), CancellationToken::new());
        assert!(tracker.claim("app.x", generation));
        assert!(tracker.is_in_cooldown("app.x"));

        tokio::time::advance(Duration::from_secs(5 * 60)).await;
        assert!(
            tracker.is_in_cooldown("app.x"),
            "still in cooldown at 5 min"
        );

        tokio::time::advance(Duration::from_secs(5 * 60)).await;
        assert!(
            !tracker.is_in_cooldown("app.x"),
            "cooldown expired at 10 min"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn test_no_cooldown_without_claim() {
        let mut tracker = MicUsageTracker::default();
        tracker.start_tracking("app.x".to_string(), CancellationToken::new());
        tracker.cancel_app("app.x");
        assert!(!tracker.is_in_cooldown("app.x"));
    }
}
