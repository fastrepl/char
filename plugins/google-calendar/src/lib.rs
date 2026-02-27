mod commands;
mod convert;
mod ext;
mod fetch;
mod fixture;
mod types;

pub use ext::{GoogleCalendarExt, GoogleCalendarPluginExt};
pub use hypr_google_calendar::{CalendarListEntry, Event};
pub use types::EventFilter;

pub(crate) struct PluginConfig {
    pub api_base_url: String,
}

const PLUGIN_NAME: &str = "google-calendar";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_calendars::<tauri::Wry>,
            commands::list_events::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();
    let api_base_url = get_api_base_url();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            use tauri::Manager;

            app.manage(reqwest::Client::new());
            app.manage(PluginConfig { api_base_url });

            Ok(())
        })
        .build()
}

fn get_api_base_url() -> String {
    #[cfg(not(debug_assertions))]
    {
        env!("VITE_API_URL").to_string()
    }

    #[cfg(debug_assertions)]
    {
        option_env!("VITE_API_URL")
            .unwrap_or("http://localhost:3001")
            .to_string()
    }
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

    #[tokio::test]
    async fn test_list_calendars() {
        let app = create_app(tauri::test::mock_builder());
        let calendars = app.google_calendar().list_calendars().await;
        assert!(calendars.is_ok());
    }

    #[tokio::test]
    async fn test_list_events() {
        let app = create_app(tauri::test::mock_builder());
        let events = app
            .google_calendar()
            .list_events(types::EventFilter {
                from: chrono::Utc::now(),
                to: chrono::Utc::now() + chrono::Duration::days(7),
                calendar_tracking_id: "primary".to_string(),
            })
            .await;
        assert!(events.is_ok());
    }
}
