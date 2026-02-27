use hypr_apple_calendar::types::{
    AppleEvent, EventStatus as AppleEventStatus, Participant, ParticipantRole, ParticipantStatus,
};
use hypr_calendar_interface::{
    AttendeeRole, AttendeeStatus, CalendarEvent, CalendarProviderType, EventAttendee, EventPerson,
    EventStatus,
};

pub fn convert_events(events: Vec<AppleEvent>) -> Vec<CalendarEvent> {
    events.into_iter().map(convert_event).collect()
}

fn convert_event(event: AppleEvent) -> CalendarEvent {
    let raw = serde_json::to_string(&event).unwrap_or_default();

    // For recurring events, synthesize a unique-per-occurrence id using occurrence_date.
    // occurrence_date is stable: it remains the same even when the event has been detached
    // and its start date has changed. Floating events (such as all-day events) are returned
    // in the default time zone.
    // See https://developer.apple.com/documentation/eventkit/ekevent/occurrencedate
    let id = if event.has_recurrence_rules {
        let date = event.occurrence_date.as_ref().unwrap_or(&event.start_date);
        let day = local_date_string(date, event.time_zone.as_deref());
        format!("{}:{}", event.event_identifier, day)
    } else {
        event.event_identifier.clone()
    };

    let organizer = event.organizer.as_ref().map(convert_person);
    let attendees = event.attendees.iter().map(convert_attendee).collect();

    // TODO: recurring_event_id should have been the synthesized `id` of the first
    // occurrence in the series. For now we just use recurrence's series_identifier as an
    // opaque value shared between all occurrences of the same series.
    let recurring_event_id = if event.has_recurrence_rules {
        Some(
            event
                .recurrence
                .expect("event with has_recurrence_rules: true must have a recurrence")
                .series_identifier
                .clone(),
        )
    } else {
        None
    };

    CalendarEvent {
        id,
        calendar_id: event.calendar.id,
        provider: CalendarProviderType::Apple,
        external_id: event.external_identifier,
        title: event.title,
        description: event.notes,
        location: event.location,
        url: event.url,
        meeting_link: None,
        started_at: event.start_date.to_rfc3339(),
        ended_at: event.end_date.to_rfc3339(),
        timezone: event.time_zone,
        is_all_day: event.is_all_day,
        status: convert_status(event.status),
        organizer,
        attendees,
        has_recurrence_rules: event.has_recurrence_rules,
        recurring_event_id,
        raw,
    }
}

fn convert_status(status: AppleEventStatus) -> EventStatus {
    match status {
        AppleEventStatus::None | AppleEventStatus::Confirmed => EventStatus::Confirmed,
        AppleEventStatus::Tentative => EventStatus::Tentative,
        AppleEventStatus::Canceled => EventStatus::Cancelled,
    }
}

fn convert_person(participant: &Participant) -> EventPerson {
    EventPerson {
        name: participant.name.clone(),
        email: participant.email.clone(),
        is_current_user: participant.is_current_user,
    }
}

fn convert_attendee(participant: &Participant) -> EventAttendee {
    EventAttendee {
        name: participant.name.clone(),
        email: participant.email.clone(),
        is_current_user: participant.is_current_user,
        status: convert_attendee_status(&participant.status),
        role: convert_attendee_role(&participant.role),
    }
}

fn convert_attendee_status(status: &ParticipantStatus) -> AttendeeStatus {
    match status {
        ParticipantStatus::Unknown | ParticipantStatus::Pending => AttendeeStatus::Pending,
        ParticipantStatus::Accepted
        | ParticipantStatus::Delegated
        | ParticipantStatus::Completed
        | ParticipantStatus::InProgress => AttendeeStatus::Accepted,
        ParticipantStatus::Tentative => AttendeeStatus::Tentative,
        ParticipantStatus::Declined => AttendeeStatus::Declined,
    }
}

fn convert_attendee_role(role: &ParticipantRole) -> AttendeeRole {
    match role {
        // RFC 5545 3.2.16: default participation role is REQ-PARTICIPANT
        ParticipantRole::Unknown | ParticipantRole::Required => AttendeeRole::Required,
        ParticipantRole::Optional => AttendeeRole::Optional,
        ParticipantRole::Chair => AttendeeRole::Chair,
        ParticipantRole::NonParticipant => AttendeeRole::NonParticipant,
    }
}

/// Convert a UTC datetime to a local date string (YYYY-MM-DD) using the event's timezone
/// if set, otherwise falling back to the system timezone.
///
/// See https://developer.apple.com/documentation/eventkit/ekcalendaritem/timezone:
/// "If nil, the calendar item is a floating event. A floating event is not tied to a particular
/// time zone. It occurs at a given time regardless of the time zone — for example, 'lunch at
/// noon.' The start and end times of a floating event should be set as if they were in the
/// system time zone."
fn local_date_string(date: &chrono::DateTime<chrono::Utc>, event_tz: Option<&str>) -> String {
    if let Some(tz_name) = event_tz
        && let Ok(tz) = tz_name.parse::<chrono_tz::Tz>()
    {
        return date.with_timezone(&tz).format("%Y-%m-%d").to_string();
    }

    date.with_timezone(&chrono::Local)
        .format("%Y-%m-%d")
        .to_string()
}
