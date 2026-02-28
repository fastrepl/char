use hypr_google_calendar::{CalendarListEntry, Event};
use tauri_plugin_auth::AuthPluginExt;

use crate::fetch;
use crate::types::EventFilter;

pub struct GoogleCalendarExt<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> GoogleCalendarExt<'a, R, M> {
    #[tracing::instrument(skip_all)]
    pub async fn list_calendars(&self) -> Result<Vec<CalendarListEntry>, String> {
        let token = self.manager.access_token().map_err(|e| e.to_string())?;

        match token {
            Some(t) if !t.is_empty() => {
                let config = self.manager.state::<crate::PluginConfig>();
                fetch::list_calendars(&config.api_base_url, &t).await
            }
            _ => Err("not authenticated".to_string()),
        }
    }

    #[tracing::instrument(skip_all)]
    pub async fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, String> {
        let token = self.manager.access_token().map_err(|e| e.to_string())?;

        match token {
            Some(t) if !t.is_empty() => {
                let config = self.manager.state::<crate::PluginConfig>();
                fetch::list_events(&config.api_base_url, &t, filter).await
            }
            _ => Err("not authenticated".to_string()),
        }
    }
}

pub trait GoogleCalendarPluginExt<R: tauri::Runtime> {
    fn google_calendar(&self) -> GoogleCalendarExt<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> GoogleCalendarPluginExt<R> for T {
    fn google_calendar(&self) -> GoogleCalendarExt<'_, R, Self>
    where
        Self: Sized,
    {
        GoogleCalendarExt {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
