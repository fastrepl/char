use hypr_google_calendar::{CalendarListEntry, Event};

use crate::GoogleCalendarPluginExt;
use crate::types::EventFilter;

#[tauri::command]
#[specta::specta]
pub async fn list_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<CalendarListEntry>, String> {
    app.google_calendar().list_calendars().await
}

#[tauri::command]
#[specta::specta]
pub async fn list_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<Event>, String> {
    app.google_calendar().list_events(filter).await
}
