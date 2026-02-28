use hypr_calendar_interface::{
    AttendeeRole, AttendeeStatus, CalendarEvent, CalendarProviderType, EventAttendee, EventPerson,
    EventStatus,
};
use hypr_google_calendar::{
    Attendee, AttendeeResponseStatus, Event, EventDateTime, EventStatus as GoogleEventStatus,
};

pub fn convert_events(events: Vec<Event>, calendar_id: &str) -> Vec<CalendarEvent> {
    events
        .into_iter()
        .map(|e| convert_event(e, calendar_id))
        .collect()
}

fn convert_event(event: Event, calendar_id: &str) -> CalendarEvent {
    let raw = serde_json::to_string(&event).unwrap_or_default();

    let is_all_day = event
        .start
        .as_ref()
        .is_some_and(|s| s.date.is_some() && s.date_time.is_none());

    let started_at = event
        .start
        .as_ref()
        .and_then(event_datetime_to_iso)
        .unwrap_or_default();
    let ended_at = event
        .end
        .as_ref()
        .and_then(event_datetime_to_iso)
        .unwrap_or_default();
    let timezone = event.start.as_ref().and_then(|s| s.time_zone.clone());

    let organizer = event.organizer.as_ref().map(|o| EventPerson {
        name: o.display_name.clone(),
        email: o.email.clone(),
        is_current_user: o.is_self.unwrap_or(false),
    });

    let attendees = event
        .attendees
        .as_deref()
        .unwrap_or_default()
        .iter()
        .map(convert_attendee)
        .collect();

    let meeting_link = event
        .hangout_link
        .clone()
        .or_else(|| extract_video_entry_point(&event));

    let has_recurrence_rules = event.recurring_event_id.is_some()
        || event.recurrence.as_ref().is_some_and(|r| !r.is_empty());

    CalendarEvent {
        id: event.id,
        calendar_id: calendar_id.to_string(),
        provider: CalendarProviderType::Google,
        external_id: event.ical_uid.unwrap_or_default(),
        title: event.summary.unwrap_or_default(),
        description: event.description,
        location: event.location,
        url: event.html_link,
        meeting_link,
        started_at,
        ended_at,
        timezone,
        is_all_day,
        status: convert_status(event.status),
        organizer,
        attendees,
        has_recurrence_rules,
        recurring_event_id: event.recurring_event_id,
        raw,
    }
}

fn event_datetime_to_iso(edt: &EventDateTime) -> Option<String> {
    if let Some(date) = &edt.date {
        Some(date.and_hms_opt(0, 0, 0)?.and_utc().to_rfc3339())
    } else {
        edt.date_time.as_ref().map(|dt| dt.to_rfc3339())
    }
}

fn convert_status(status: Option<GoogleEventStatus>) -> EventStatus {
    match status {
        Some(GoogleEventStatus::Tentative) => EventStatus::Tentative,
        Some(GoogleEventStatus::Cancelled) => EventStatus::Cancelled,
        _ => EventStatus::Confirmed,
    }
}

fn convert_attendee(attendee: &Attendee) -> EventAttendee {
    let is_organizer = attendee.organizer.unwrap_or(false);
    let is_optional = attendee.optional.unwrap_or(false);

    EventAttendee {
        name: attendee.display_name.clone(),
        email: attendee.email.clone(),
        is_current_user: attendee.is_self.unwrap_or(false),
        status: convert_attendee_status(&attendee.response_status),
        role: if is_organizer {
            AttendeeRole::Chair
        } else if is_optional {
            AttendeeRole::Optional
        } else {
            AttendeeRole::Required
        },
    }
}

fn convert_attendee_status(status: &Option<AttendeeResponseStatus>) -> AttendeeStatus {
    match status {
        Some(AttendeeResponseStatus::Accepted) => AttendeeStatus::Accepted,
        Some(AttendeeResponseStatus::Tentative) => AttendeeStatus::Tentative,
        Some(AttendeeResponseStatus::Declined) => AttendeeStatus::Declined,
        _ => AttendeeStatus::Pending,
    }
}

fn extract_video_entry_point(event: &Event) -> Option<String> {
    event
        .conference_data
        .as_ref()?
        .entry_points
        .as_ref()?
        .iter()
        .find(|ep| {
            matches!(
                ep.entry_point_type,
                hypr_google_calendar::EntryPointType::Video
            )
        })
        .map(|ep| ep.uri.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use hypr_google_calendar::{
        Attendee, AttendeeResponseStatus, EventDateTime, EventStatus as GoogleEventStatus,
    };

    #[test]
    fn status_maps_correctly() {
        assert!(matches!(convert_status(None), EventStatus::Confirmed));
        assert!(matches!(
            convert_status(Some(GoogleEventStatus::Confirmed)),
            EventStatus::Confirmed
        ));
        assert!(matches!(
            convert_status(Some(GoogleEventStatus::Unknown)),
            EventStatus::Confirmed
        ));
        assert!(matches!(
            convert_status(Some(GoogleEventStatus::Tentative)),
            EventStatus::Tentative
        ));
        assert!(matches!(
            convert_status(Some(GoogleEventStatus::Cancelled)),
            EventStatus::Cancelled
        ));
    }

    #[test]
    fn attendee_status_needs_action_and_unknown_are_pending() {
        assert!(matches!(
            convert_attendee_status(&Some(AttendeeResponseStatus::NeedsAction)),
            AttendeeStatus::Pending
        ));
        assert!(matches!(
            convert_attendee_status(&None),
            AttendeeStatus::Pending
        ));
        assert!(matches!(
            convert_attendee_status(&Some(AttendeeResponseStatus::Unknown)),
            AttendeeStatus::Pending
        ));
    }

    #[test]
    fn attendee_role_organizer_is_chair() {
        let attendee = Attendee {
            organizer: Some(true),
            optional: Some(false),
            ..Default::default()
        };
        assert!(matches!(
            convert_attendee(&attendee).role,
            AttendeeRole::Chair
        ));
    }

    #[test]
    fn attendee_role_optional_beats_non_organizer() {
        let attendee = Attendee {
            organizer: Some(false),
            optional: Some(true),
            ..Default::default()
        };
        assert!(matches!(
            convert_attendee(&attendee).role,
            AttendeeRole::Optional
        ));
    }

    #[test]
    fn attendee_role_defaults_to_required() {
        let attendee = Attendee::default();
        assert!(matches!(
            convert_attendee(&attendee).role,
            AttendeeRole::Required
        ));
    }

    #[test]
    fn all_day_event_converts_to_midnight_utc() {
        let date = chrono::NaiveDate::from_ymd_opt(2024, 6, 15).unwrap();
        let edt = EventDateTime {
            date: Some(date),
            date_time: None,
            time_zone: None,
        };
        let iso = event_datetime_to_iso(&edt).unwrap();
        assert!(iso.starts_with("2024-06-15T00:00:00+00:00"));
    }

    #[test]
    fn timed_event_preserves_offset() {
        use chrono::{FixedOffset, TimeZone};
        let offset = FixedOffset::east_opt(9 * 3600).unwrap();
        let dt = offset.with_ymd_and_hms(2024, 6, 15, 10, 0, 0).unwrap();
        let edt = EventDateTime {
            date: None,
            date_time: Some(dt),
            time_zone: None,
        };
        let iso = event_datetime_to_iso(&edt).unwrap();
        assert!(iso.contains("10:00:00"));
        assert!(iso.contains("+09:00"));
    }
}
