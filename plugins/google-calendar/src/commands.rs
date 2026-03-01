use hypr_calendar_interface::CalendarEvent;
use hypr_google_calendar::CalendarListEntry;

use crate::GoogleCalendarPluginExt;
use crate::error::Error;
use crate::types::EventFilter;

#[tauri::command]
#[specta::specta]
pub async fn list_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<CalendarListEntry>, Error> {
    app.google_calendar().list_calendars().await
}

#[tauri::command]
#[specta::specta]
pub async fn list_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<CalendarEvent>, Error> {
    let calendar_id = filter.calendar_tracking_id.clone();
    let events = app.google_calendar().list_events(filter).await?;
    Ok(crate::convert::convert_events(events, &calendar_id))
}
