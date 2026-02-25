use std::sync::{Arc, Mutex};

#[cfg(feature = "google-meet")]
use hypr_detect::GoogleMeetRuntime;
use tauri::Manager;

mod commands;
mod dnd;
mod env;
mod error;
mod events;
mod ext;
#[cfg(feature = "google-meet")]
mod google_meet_runtime;
mod handler;
mod mic_usage_tracker;
mod policy;

pub use dnd::*;
pub use error::*;
pub use events::*;
pub use ext::*;
pub use policy::*;

const PLUGIN_NAME: &str = "detect";

pub(crate) type DetectorState = Mutex<hypr_detect::Detector>;
pub(crate) type ProcessorState = Arc<Mutex<Processor>>;

pub(crate) struct Processor {
    pub(crate) policy: policy::MicNotificationPolicy,
    pub(crate) mic_usage_tracker: mic_usage_tracker::MicUsageTracker,
    pub(crate) mic_active_threshold_secs: u64,
}

impl Default for Processor {
    fn default() -> Self {
        Self {
            policy: Default::default(),
            mic_usage_tracker: Default::default(),
            mic_active_threshold_secs: mic_usage_tracker::DEFAULT_MIC_ACTIVE_THRESHOLD_SECS,
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_installed_applications::<tauri::Wry>,
            commands::list_mic_using_applications::<tauri::Wry>,
            commands::set_respect_do_not_disturb::<tauri::Wry>,
            commands::set_ignored_bundle_ids::<tauri::Wry>,
            commands::list_default_ignored_bundle_ids::<tauri::Wry>,
            commands::get_preferred_languages::<tauri::Wry>,
            commands::get_current_locale_identifier::<tauri::Wry>,
            commands::set_mic_active_threshold::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![DetectEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            app.manage(DetectorState::default());
            app.manage(ProcessorState::default());

            #[cfg(feature = "google-meet")]
            {
                let runtime = std::sync::Arc::new(google_meet_runtime::TauriGoogleMeetRuntime);
                runtime.register_chrome_native_host();

                let detector_state = app.state::<DetectorState>();
                let mut detector = detector_state.lock().unwrap();
                detector.set_google_meet_runtime(runtime);
            }

            let app_handle = app.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                handler::setup(&app_handle).unwrap();
            });

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap();

        let content = std::fs::read_to_string(OUTPUT_FILE).unwrap();
        std::fs::write(OUTPUT_FILE, format!("// @ts-nocheck\n{content}")).unwrap();
    }

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[test]
    fn test_detect() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
