use crate::AppleCalendarPluginExt;
use hypr_apple_calendar::types::{AppleCalendar, AppleEvent, CreateEventInput, EventFilter};

#[tauri::command]
#[specta::specta]
pub fn open_calendar<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.apple_calendar().open_calendar()
}

#[tauri::command]
#[specta::specta]
pub fn list_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<AppleCalendar>, String> {
    app.apple_calendar().list_calendars()
}

#[tauri::command]
#[specta::specta]
pub fn list_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<AppleEvent>, String> {
    app.apple_calendar().list_events(filter)
}

#[tauri::command]
#[specta::specta]
pub fn create_event<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    input: CreateEventInput,
) -> Result<String, String> {
    app.apple_calendar().create_event(input)
}

#[cfg(feature = "fixture")]
#[derive(serde::Serialize, specta::Type)]
pub struct FixtureInfo {
    pub current_step: usize,
    pub max_steps: usize,
    pub step_name: String,
}

#[cfg(feature = "fixture")]
#[tauri::command]
#[specta::specta]
pub fn advance_fixture() -> FixtureInfo {
    let step = crate::fixture::advance_step();
    FixtureInfo {
        current_step: step,
        max_steps: crate::fixture::get_max_steps(),
        step_name: crate::fixture::get_step_name(step).to_string(),
    }
}

#[cfg(feature = "fixture")]
#[tauri::command]
#[specta::specta]
pub fn reset_fixture() -> FixtureInfo {
    crate::fixture::reset_step();
    let step = crate::fixture::get_step();
    FixtureInfo {
        current_step: step,
        max_steps: crate::fixture::get_max_steps(),
        step_name: crate::fixture::get_step_name(step).to_string(),
    }
}

#[cfg(feature = "fixture")]
#[tauri::command]
#[specta::specta]
pub fn get_fixture_info() -> FixtureInfo {
    let step = crate::fixture::get_step();
    FixtureInfo {
        current_step: step,
        max_steps: crate::fixture::get_max_steps(),
        step_name: crate::fixture::get_step_name(step).to_string(),
    }
}
