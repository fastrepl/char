#[cfg(feature = "fixture")]
pub use hypr_apple_calendar::fixture;

mod commands;
mod error;
mod events;
mod ext;

pub use error::{Error, Result};
pub use events::*;
pub use ext::{AppleCalendarExt, AppleCalendarPluginExt};
pub use hypr_apple_calendar::types;
pub use hypr_apple_calendar::types::*;

const PLUGIN_NAME: &str = "apple-calendar";

#[cfg(not(feature = "fixture"))]
fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::open_calendar::<tauri::Wry>,
            commands::list_calendars::<tauri::Wry>,
            commands::list_events::<tauri::Wry>,
            commands::create_event::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![CalendarChangedEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

#[cfg(feature = "fixture")]
fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::open_calendar::<tauri::Wry>,
            commands::list_calendars::<tauri::Wry>,
            commands::list_events::<tauri::Wry>,
            commands::create_event::<tauri::Wry>,
            commands::advance_fixture,
            commands::reset_fixture,
            commands::get_fixture_info,
        ])
        .events(tauri_specta::collect_events![CalendarChangedEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            #[cfg(all(target_os = "macos", not(feature = "fixture")))]
            {
                use tauri::Manager;
                use tauri_specta::Event;

                let app_handle = app.app_handle().clone();
                hypr_apple_calendar::setup_change_notification(move || {
                    let _ = CalendarChangedEvent.emit(&app_handle);
                });
            }

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
    fn test_list_calendars() {
        let app = create_app(tauri::test::mock_builder());

        let calendars = app.apple_calendar().list_calendars();
        println!("calendars: {:?}", calendars);
    }

    #[test]
    fn test_list_events() {
        let app = create_app(tauri::test::mock_builder());

        match app.apple_calendar().list_calendars() {
            Ok(calendars) => {
                if let Some(calendar) = calendars.first() {
                    println!(
                        "Testing with calendar: {} ({})",
                        calendar.title, calendar.id
                    );
                    let events = app.apple_calendar().list_events(
                        hypr_apple_calendar::types::EventFilter {
                            from: chrono::Utc::now(),
                            to: chrono::Utc::now() + chrono::Duration::days(7),
                            calendar_tracking_id: calendar.id.clone(),
                        },
                    );
                    println!("events: {:?}", events);
                } else {
                    println!("No calendars found");
                }
            }
            Err(e) => {
                println!("Error listing calendars: {:?}", e);
            }
        }
    }
}
