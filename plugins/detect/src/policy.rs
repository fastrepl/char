use std::collections::{BTreeSet, HashSet};

use hypr_notification_interface::NotificationKey;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MicEventType {
    Started,
    Stopped,
}

// We intentionally don't include the "already listening" reason here; that filtering should be done by the consumer side.

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SkipReason {
    DoNotDisturb,
    AllAppsFiltered,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppCategory {
    Hyprnote,
    Dictation,
    IDE,
    ScreenRecording,
    AIAssistant,
    Other,
}

impl AppCategory {
    pub fn bundle_ids(&self) -> &'static [&'static str] {
        match self {
            Self::Hyprnote => &[
                "com.hyprnote.dev",
                "com.hyprnote.stable",
                "com.hyprnote.nightly",
                "com.hyprnote.staging",
            ],
            Self::Dictation => &[
                "com.electron.wispr-flow",
                "com.seewillow.WillowMac",
                "com.superduper.superwhisper",
                "com.prakashjoshipax.VoiceInk",
                "com.goodsnooze.macwhisper",
                "com.descript.beachcube",
                "com.apple.VoiceMemos",
                "com.electron.aqua-voice",
            ],
            Self::IDE => &[
                "dev.warp.Warp-Stable",
                "com.exafunction.windsurf",
                "com.microsoft.VSCode",
                "com.todesktop.230313mzl4w4u92",
            ],
            Self::ScreenRecording => &[
                "so.cap.desktop",
                "com.timpler.screenstudio",
                "com.loom.desktop",
                "com.obsproject.obs-studio",
            ],
            Self::AIAssistant => &["com.openai.chat", "com.anthropic.claudefordesktop"],
            Self::Other => &[
                "com.raycast.macos",
                "com.apple.garageband10",
                "com.apple.Sound-Settings.extension",
            ],
        }
    }

    pub fn all() -> &'static [AppCategory] {
        &[
            Self::Hyprnote,
            Self::Dictation,
            Self::IDE,
            Self::ScreenRecording,
            Self::AIAssistant,
            Self::Other,
        ]
    }

    pub fn find_category(bundle_id: &str) -> Option<AppCategory> {
        for category in Self::all() {
            if category.bundle_ids().contains(&bundle_id) {
                return Some(*category);
            }
        }
        None
    }
}

pub fn default_ignored_bundle_ids() -> Vec<String> {
    AppCategory::all()
        .iter()
        .flat_map(|cat| cat.bundle_ids().iter().map(|s| s.to_string()))
        .collect()
}

pub struct PolicyContext<'a> {
    pub apps: &'a [hypr_detect::InstalledApp],
    pub is_dnd: bool,
    pub event_type: MicEventType,
}

pub struct PolicyResult {
    pub filtered_apps: Vec<hypr_detect::InstalledApp>,
    pub dedup_key: String,
}

pub struct MicNotificationPolicy {
    pub respect_dnd: bool,
    pub ignored_categories: Vec<AppCategory>,
    pub user_ignored_bundle_ids: HashSet<String>,
}

impl MicNotificationPolicy {
    pub fn should_track_app(&self, app_id: &str) -> bool {
        AppCategory::find_category(app_id).is_none()
            && !self.user_ignored_bundle_ids.contains(app_id)
    }

    fn filter_apps(
        &self,
        apps: &[hypr_detect::InstalledApp],
        is_dnd: bool,
    ) -> Result<Vec<hypr_detect::InstalledApp>, SkipReason> {
        if self.respect_dnd && is_dnd {
            return Err(SkipReason::DoNotDisturb);
        }

        let ignored_from_categories: BTreeSet<&str> = self
            .ignored_categories
            .iter()
            .flat_map(|cat| cat.bundle_ids().iter().copied())
            .collect();

        let filtered_apps: Vec<_> = apps
            .iter()
            .filter(|app| {
                !self.user_ignored_bundle_ids.contains(&app.id)
                    && !ignored_from_categories.contains(app.id.as_str())
            })
            .cloned()
            .collect();

        if filtered_apps.is_empty() {
            return Err(SkipReason::AllAppsFiltered);
        }

        Ok(filtered_apps)
    }

    pub fn evaluate(&self, ctx: &PolicyContext) -> Result<PolicyResult, SkipReason> {
        let filtered_apps = self.filter_apps(ctx.apps, ctx.is_dnd)?;

        let notification_key = match ctx.event_type {
            MicEventType::Started => {
                NotificationKey::mic_started(filtered_apps.iter().map(|a| a.id.clone()))
            }
            MicEventType::Stopped => {
                NotificationKey::mic_stopped(filtered_apps.iter().map(|a| a.id.clone()))
            }
        };

        Ok(PolicyResult {
            filtered_apps,
            dedup_key: notification_key.to_dedup_key(),
        })
    }
}

impl Default for MicNotificationPolicy {
    fn default() -> Self {
        Self {
            respect_dnd: false,
            ignored_categories: AppCategory::all().to_vec(),
            user_ignored_bundle_ids: HashSet::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_key_dedup() {
        let key1 = NotificationKey::mic_started(["com.zoom.us".to_string()]);
        let key2 = NotificationKey::mic_started(["com.zoom.us".to_string()]);
        assert_eq!(key1.to_dedup_key(), key2.to_dedup_key());

        let key3 = NotificationKey::mic_started([
            "com.zoom.us".to_string(),
            "com.slack.Slack".to_string(),
        ]);
        let key4 = NotificationKey::mic_started([
            "com.slack.Slack".to_string(),
            "com.zoom.us".to_string(),
        ]);
        assert_eq!(key3.to_dedup_key(), key4.to_dedup_key());
    }

    #[test]
    fn test_app_category_find() {
        assert_eq!(
            AppCategory::find_category("com.hyprnote.dev"),
            Some(AppCategory::Hyprnote)
        );
        assert_eq!(AppCategory::find_category("com.zoom.us"), None);
    }
}
