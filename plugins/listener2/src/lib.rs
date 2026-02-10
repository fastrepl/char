use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

mod batch;
mod commands;
mod error;
mod events;
mod ext;
mod subtitle;

pub use error::{Error, Result};
pub use events::*;
pub use ext::*;
pub use subtitle::*;

const PLUGIN_NAME: &str = "listener2";

pub type SharedState = Arc<Mutex<State>>;

pub struct State {
    pub app: tauri::AppHandle,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::run_batch::<tauri::Wry>,
            commands::parse_subtitle::<tauri::Wry>,
            commands::export_to_vtt::<tauri::Wry>,
            commands::diarize_session::<tauri::Wry>,
            commands::is_supported_languages_batch::<tauri::Wry>,
            commands::suggest_providers_for_languages_batch::<tauri::Wry>,
            commands::list_documented_language_codes_batch::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![BatchEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let app_handle = app.app_handle().clone();
            let state: SharedState = Arc::new(Mutex::new(State { app: app_handle }));
            app.manage(state);

            Ok(())
        })
        .build()
}

pub fn parse_subtitle_from_path<P: AsRef<std::path::Path>>(
    path: P,
) -> std::result::Result<Subtitle, String> {
    use aspasia::TimedSubtitleFile;
    let sub = TimedSubtitleFile::new(path.as_ref()).map_err(|e| e.to_string())?;
    Ok(sub.into())
}

pub fn export_words_to_vtt<P: AsRef<std::path::Path>>(
    words: Vec<VttWord>,
    path: P,
) -> std::result::Result<(), String> {
    use std::io::Write;

    let mut content = String::from("WEBVTT\n\n");

    for word in words {
        if let Some(ref speaker) = word.speaker {
            content.push_str(speaker);
            content.push('\n');
        }

        let start = format_vtt_timestamp(word.start_ms);
        let end = format_vtt_timestamp(word.end_ms);
        content.push_str(&format!("{} --> {}\n", start, end));
        content.push_str(&word.text);
        content.push_str("\n\n");
    }

    let mut file = std::fs::File::create(path.as_ref()).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn format_vtt_timestamp(ms: u64) -> String {
    let hours = ms / 3_600_000;
    let minutes = (ms % 3_600_000) / 60_000;
    let seconds = (ms % 60_000) / 1_000;
    let millis = ms % 1_000;
    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, seconds, millis)
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
}
