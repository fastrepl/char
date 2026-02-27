use hypr_apple_calendar::types::{AppleCalendar, AppleEvent, CreateEventInput, EventFilter};

pub struct AppleCalendarExt<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

#[cfg(feature = "fixture")]
impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleCalendarExt<'a, R, M> {
    #[tracing::instrument(skip_all)]
    pub fn open_calendar(&self) -> Result<(), String> {
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        crate::fixture::list_calendars()
    }

    #[tracing::instrument(skip_all)]
    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        crate::fixture::list_events(filter)
    }

    #[tracing::instrument(skip_all)]
    pub fn create_event(&self, _input: CreateEventInput) -> Result<String, String> {
        Ok("fixture-event-created".to_string())
    }
}

#[cfg(all(target_os = "macos", not(feature = "fixture")))]
mod contact_bridge {
    use hypr_apple_calendar::ContactFetcher;
    use hypr_apple_calendar::types::ParticipantContact;

    pub struct AppleContactFetcher;

    impl ContactFetcher for AppleContactFetcher {
        fn fetch_contact_with_predicate(
            &self,
            predicate: &objc2_foundation::NSPredicate,
        ) -> Option<ParticipantContact> {
            let contact = tauri_plugin_apple_contact::fetch_contact_with_predicate(predicate)?;
            Some(ParticipantContact {
                identifier: contact.identifier,
                given_name: contact.given_name,
                family_name: contact.family_name,
                middle_name: contact.middle_name,
                organization_name: contact.organization_name,
                job_title: contact.job_title,
                email_addresses: contact.email_addresses,
                phone_numbers: contact.phone_numbers,
                url_addresses: contact.url_addresses,
                image_available: contact.image_available,
            })
        }
    }
}

#[cfg(all(target_os = "macos", not(feature = "fixture")))]
impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleCalendarExt<'a, R, M> {
    #[tracing::instrument(skip_all)]
    pub fn open_calendar(&self) -> Result<(), String> {
        let script = String::from(
            "
            tell application \"Calendar\"
                activate
                switch view to month view
                view calendar at current date
            end tell
        ",
        );

        std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        let handle = hypr_apple_calendar::Handle::new();
        handle.list_calendars().map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        let handle = hypr_apple_calendar::Handle::with_contact_fetcher(
            Box::new(contact_bridge::AppleContactFetcher),
        );
        handle.list_events(filter).map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    pub fn create_event(&self, input: CreateEventInput) -> Result<String, String> {
        let handle = hypr_apple_calendar::Handle::new();
        handle.create_event(input).map_err(|e| e.to_string())
    }
}

#[cfg(all(not(target_os = "macos"), not(feature = "fixture")))]
impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleCalendarExt<'a, R, M> {
    pub fn open_calendar(&self) -> Result<(), String> {
        Err("not supported on this platform".to_string())
    }

    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        Err("not supported on this platform".to_string())
    }

    pub fn list_events(&self, _filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        Err("not supported on this platform".to_string())
    }

    pub fn create_event(&self, _input: CreateEventInput) -> Result<String, String> {
        Err("not supported on this platform".to_string())
    }
}

pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn apple_calendar(&self) -> AppleCalendarExt<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AppleCalendarPluginExt<R> for T {
    fn apple_calendar(&self) -> AppleCalendarExt<'_, R, Self>
    where
        Self: Sized,
    {
        AppleCalendarExt {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
