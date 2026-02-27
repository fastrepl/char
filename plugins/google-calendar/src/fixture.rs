use chrono::{Duration, Utc};

use hypr_google_calendar::{CalendarListEntry, Event, EventDateTime};

use crate::types::EventFilter;

fn load_calendars() -> Vec<CalendarListEntry> {
    vec![
        CalendarListEntry {
            id: "primary".to_string(),
            kind: None,
            etag: None,
            summary: Some("Primary".to_string()),
            description: None,
            location: None,
            time_zone: None,
            summary_override: None,
            color_id: None,
            background_color: None,
            foreground_color: None,
            hidden: None,
            selected: None,
            primary: None,
            deleted: None,
            access_role: None,
            data_owner: None,
            default_reminders: None,
            notification_settings: None,
            conference_properties: None,
            auto_accept_invitations: None,
        },
        CalendarListEntry {
            id: "work".to_string(),
            kind: None,
            etag: None,
            summary: Some("Work".to_string()),
            description: None,
            location: None,
            time_zone: None,
            summary_override: None,
            color_id: None,
            background_color: None,
            foreground_color: None,
            hidden: None,
            selected: None,
            primary: None,
            deleted: None,
            access_role: None,
            data_owner: None,
            default_reminders: None,
            notification_settings: None,
            conference_properties: None,
            auto_accept_invitations: None,
        },
    ]
}

fn load_events(filter: EventFilter) -> Vec<Event> {
    let now = Utc::now();
    let base = vec![
        Event {
            id: "evt-1".to_string(),
            kind: None,
            etag: None,
            status: None,
            html_link: None,
            created: None,
            updated: None,
            summary: Some("Fixture Meeting".to_string()),
            description: None,
            location: Some("Conference Room A".to_string()),
            color_id: None,
            creator: None,
            organizer: None,
            start: Some(EventDateTime {
                date: None,
                date_time: Some(
                    (now + Duration::hours(2))
                        .with_timezone(&chrono::FixedOffset::east_opt(0).unwrap()),
                ),
                time_zone: None,
            }),
            end: Some(EventDateTime {
                date: None,
                date_time: Some(
                    (now + Duration::hours(3))
                        .with_timezone(&chrono::FixedOffset::east_opt(0).unwrap()),
                ),
                time_zone: None,
            }),
            end_time_unspecified: None,
            recurrence: None,
            recurring_event_id: None,
            original_start_time: None,
            transparency: None,
            visibility: None,
            ical_uid: None,
            sequence: None,
            attendees: None,
            attendees_omitted: None,
            extended_properties: None,
            hangout_link: None,
            conference_data: None,
            gadget: None,
            anyone_can_add_self: None,
            guests_can_invite_others: None,
            guests_can_modify: None,
            guests_can_see_other_guests: None,
            private_copy: None,
            locked: None,
            reminders: None,
            source: None,
            working_location_properties: None,
            out_of_office_properties: None,
            focus_time_properties: None,
            attachments: None,
            birthday_properties: None,
            event_type: None,
        },
        Event {
            id: "evt-2".to_string(),
            kind: None,
            etag: None,
            status: None,
            html_link: None,
            created: None,
            updated: None,
            summary: Some("Fixture All Day Event".to_string()),
            description: None,
            location: None,
            color_id: None,
            creator: None,
            organizer: None,
            start: Some(EventDateTime {
                date: Some(now.date_naive()),
                date_time: None,
                time_zone: None,
            }),
            end: Some(EventDateTime {
                date: Some((now + Duration::days(1)).date_naive()),
                date_time: None,
                time_zone: None,
            }),
            end_time_unspecified: None,
            recurrence: None,
            recurring_event_id: None,
            original_start_time: None,
            transparency: None,
            visibility: None,
            ical_uid: None,
            sequence: None,
            attendees: None,
            attendees_omitted: None,
            extended_properties: None,
            hangout_link: None,
            conference_data: None,
            gadget: None,
            anyone_can_add_self: None,
            guests_can_invite_others: None,
            guests_can_modify: None,
            guests_can_see_other_guests: None,
            private_copy: None,
            locked: None,
            reminders: None,
            source: None,
            working_location_properties: None,
            out_of_office_properties: None,
            focus_time_properties: None,
            attachments: None,
            birthday_properties: None,
            event_type: None,
        },
    ];

    base.into_iter()
        .filter(|e| {
            let (start, end) = match (&e.start, &e.end) {
                (Some(s), Some(ed)) => {
                    let start_utc = s
                        .date
                        .as_ref()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
                        .or_else(|| s.date_time.as_ref().map(|dt| dt.with_timezone(&Utc)));
                    let end_utc = ed
                        .date
                        .as_ref()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
                        .or_else(|| ed.date_time.as_ref().map(|dt| dt.with_timezone(&Utc)));
                    let (Some(s), Some(ev)) = (start_utc, end_utc) else {
                        return false;
                    };
                    (s, ev)
                }
                _ => return false,
            };
            start < filter.to && end > filter.from
        })
        .collect()
}

pub fn list_calendars() -> Result<Vec<CalendarListEntry>, String> {
    Ok(load_calendars())
}

pub fn list_events(filter: EventFilter) -> Result<Vec<Event>, String> {
    Ok(load_events(filter))
}
