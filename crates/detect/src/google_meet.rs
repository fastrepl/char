use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use serde::Deserialize;

use crate::{BackgroundTask, DetectCallback, DetectEvent};

pub trait GoogleMeetRuntime: Send + Sync + 'static {
    fn chrome_state_path(&self) -> PathBuf;
    fn native_host_binary_path(&self) -> Option<PathBuf>;
    fn chrome_native_messaging_hosts_dir(&self) -> Option<PathBuf>;

    fn register_chrome_native_host(&self) {
        let Some(dir) = self.chrome_native_messaging_hosts_dir() else {
            tracing::warn!("could not determine Chrome NativeMessagingHosts directory");
            return;
        };

        let Some(binary_path) = self.native_host_binary_path() else {
            tracing::warn!("could not resolve native messaging host binary path");
            return;
        };

        if let Err(e) = std::fs::create_dir_all(&dir) {
            tracing::warn!("failed to create NativeMessagingHosts dir: {e}");
            return;
        }

        let manifest = NativeMessagingManifest {
            name: "com.hyprnote.chrome".to_string(),
            description: "Hyprnote Chrome integration".to_string(),
            path: binary_path.to_string_lossy().into_owned(),
            host_type: "stdio".to_string(),
            allowed_origins: vec!["chrome-extension://hyprnote/".to_string()],
        };

        let manifest_path = dir.join("com.hyprnote.chrome.json");

        match serde_json::to_string_pretty(&manifest) {
            Ok(json) => {
                if let Err(e) = std::fs::write(&manifest_path, json) {
                    tracing::warn!("failed to write native messaging manifest: {e}");
                } else {
                    tracing::info!(
                        "registered Chrome native messaging host at {}",
                        manifest_path.display()
                    );
                }
            }
            Err(e) => {
                tracing::warn!("failed to serialize native messaging manifest: {e}");
            }
        }
    }
}

#[derive(serde::Serialize)]
struct NativeMessagingManifest {
    name: String,
    description: String,
    path: String,
    #[serde(rename = "type")]
    host_type: String,
    allowed_origins: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct ChromeState {
    #[allow(dead_code)]
    version: u32,
    timestamp_ms: u64,
    meeting: Option<MeetingState>,
}

#[derive(Debug, Clone, Deserialize)]
struct MeetingState {
    #[allow(dead_code)]
    url: String,
    is_active: bool,
    muted: bool,
    participants: Vec<MeetParticipant>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, serde::Serialize, specta::Type)]
pub struct MeetParticipant {
    pub name: String,
    pub is_self: bool,
}

pub struct GoogleMeetWatcher {
    background: BackgroundTask,
    runtime: Option<Arc<dyn GoogleMeetRuntime>>,
}

impl Default for GoogleMeetWatcher {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
            runtime: None,
        }
    }
}

impl GoogleMeetWatcher {
    pub fn set_runtime(&mut self, runtime: Arc<dyn GoogleMeetRuntime>) {
        self.runtime = Some(runtime);
    }
}

struct WatcherState {
    last_mute_state: Option<bool>,
    last_participants: Option<Vec<MeetParticipant>>,
    poll_interval: Duration,
}

impl WatcherState {
    fn new() -> Self {
        Self {
            last_mute_state: None,
            last_participants: None,
            poll_interval: Duration::from_millis(500),
        }
    }
}

const STALENESS_THRESHOLD_MS: u64 = 30_000;

fn read_chrome_state(path: &PathBuf) -> Option<ChromeState> {
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

fn is_stale(timestamp_ms: u64) -> bool {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    now.saturating_sub(timestamp_ms) > STALENESS_THRESHOLD_MS
}

impl crate::Observer for GoogleMeetWatcher {
    fn start(&mut self, f: DetectCallback) {
        if self.background.is_running() {
            return;
        }

        let Some(runtime) = self.runtime.clone() else {
            tracing::debug!("google meet watcher has no runtime, skipping start");
            return;
        };

        let chrome_state_path = runtime.chrome_state_path();

        self.background.start(|running, mut rx| async move {
            let mut state = WatcherState::new();

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = tokio::time::sleep(state.poll_interval) => {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }

                        let chrome_state = match read_chrome_state(&chrome_state_path) {
                            Some(s) => s,
                            None => {
                                if state.last_mute_state.is_some() {
                                    tracing::debug!("chrome state file gone, clearing state");
                                    state.last_mute_state = None;
                                    state.last_participants = None;
                                }
                                continue;
                            }
                        };

                        if is_stale(chrome_state.timestamp_ms) {
                            if state.last_mute_state.is_some() {
                                tracing::debug!("chrome state stale, clearing");
                                state.last_mute_state = None;
                                state.last_participants = None;
                            }
                            continue;
                        }

                        match chrome_state.meeting {
                            Some(meeting) if meeting.is_active => {
                                if state.last_mute_state != Some(meeting.muted) {
                                    tracing::info!(muted = meeting.muted, "google meet mute state changed");
                                    state.last_mute_state = Some(meeting.muted);
                                    f(DetectEvent::GoogleMeetMuteStateChanged { value: meeting.muted });
                                }

                                if state.last_participants.as_ref() != Some(&meeting.participants) {
                                    tracing::info!(count = meeting.participants.len(), "google meet participants changed");
                                    state.last_participants = Some(meeting.participants.clone());
                                    f(DetectEvent::GoogleMeetParticipantsChanged { participants: meeting.participants });
                                }
                            }
                            _ => {
                                if state.last_mute_state.is_some() {
                                    tracing::debug!("google meet meeting ended, clearing state");
                                    state.last_mute_state = None;
                                    state.last_participants = None;
                                }
                            }
                        }
                    }
                }
            }

            tracing::info!("google meet watcher stopped");
        });
    }

    fn stop(&mut self) {
        self.background.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Observer, new_callback};
    use std::time::Duration;

    // cargo test --package detect --lib --features mic,list,google-meet -- google_meet::tests::test_watcher --exact --nocapture --ignored
    #[tokio::test]
    #[ignore]
    async fn test_watcher() {
        let mut watcher = GoogleMeetWatcher::default();
        watcher.start(new_callback(|v| {
            println!("{:?}", v);
        }));

        tokio::time::sleep(Duration::from_secs(60)).await;
        watcher.stop();
    }
}
