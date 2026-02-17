use axum::Json;
use hypr_api_nango::{GoogleCalendar, NangoConnection};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::{CalendarError, Result};

#[derive(Debug, Serialize, ToSchema)]
pub struct ListCalendarsResponse {
    pub calendars: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListEventsRequest {
    pub calendar_id: String,
    #[serde(default)]
    pub time_min: Option<String>,
    #[serde(default)]
    pub time_max: Option<String>,
    #[serde(default)]
    pub max_results: Option<u32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub single_events: Option<bool>,
    #[serde(default)]
    pub order_by: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListEventsResponse {
    pub events: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateEventRequest {
    pub calendar_id: String,
    pub summary: String,
    pub start: EventDateTime,
    pub end: EventDateTime,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub attendees: Option<Vec<EventAttendee>>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct EventDateTime {
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default, rename = "dateTime")]
    pub date_time: Option<String>,
    #[serde(default, rename = "timeZone")]
    pub time_zone: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct EventAttendee {
    pub email: String,
    #[serde(default, rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub optional: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreateEventResponse {
    pub event: serde_json::Value,
}

fn parse_date(s: &str, field: &str) -> std::result::Result<chrono::NaiveDate, CalendarError> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .map_err(|e| CalendarError::BadRequest(format!("Invalid {field}: {e}")))
}

fn parse_datetime(
    s: &str,
    field: &str,
) -> std::result::Result<chrono::DateTime<chrono::FixedOffset>, CalendarError> {
    chrono::DateTime::parse_from_rfc3339(s)
        .map_err(|e| CalendarError::BadRequest(format!("Invalid {field}: {e}")))
}

fn convert_event_datetime(
    dt: EventDateTime,
    prefix: &str,
) -> std::result::Result<hypr_google_calendar::EventDateTime, CalendarError> {
    Ok(hypr_google_calendar::EventDateTime {
        date: dt
            .date
            .map(|s| parse_date(&s, &format!("{prefix}.date")))
            .transpose()?,
        date_time: dt
            .date_time
            .map(|s| parse_datetime(&s, &format!("{prefix}.dateTime")))
            .transpose()?,
        time_zone: dt.time_zone,
    })
}

#[utoipa::path(
    post,
    path = "/calendars",
    responses(
        (status = 200, description = "Calendars fetched", body = ListCalendarsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "calendar",
)]
pub async fn list_calendars(
    nango: NangoConnection<GoogleCalendar>,
) -> Result<Json<ListCalendarsResponse>> {
    let client = hypr_google_calendar::GoogleCalendarClient::new(nango.into_http());

    let response = client
        .list_calendars()
        .await
        .map_err(|e| CalendarError::Internal(e.to_string()))?;

    let calendars: Vec<serde_json::Value> = response
        .items
        .iter()
        .map(|c| serde_json::to_value(c).unwrap_or_default())
        .collect();

    Ok(Json(ListCalendarsResponse { calendars }))
}

#[utoipa::path(
    post,
    path = "/events",
    request_body = ListEventsRequest,
    responses(
        (status = 200, description = "Events fetched", body = ListEventsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "calendar",
)]
pub async fn list_events(
    nango: NangoConnection<GoogleCalendar>,
    Json(payload): Json<ListEventsRequest>,
) -> Result<Json<ListEventsResponse>> {
    let client = hypr_google_calendar::GoogleCalendarClient::new(nango.into_http());

    let time_min = payload
        .time_min
        .as_deref()
        .map(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .map_err(|e| CalendarError::BadRequest(format!("Invalid time_min: {e}")))
        })
        .transpose()?;

    let time_max = payload
        .time_max
        .as_deref()
        .map(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .map_err(|e| CalendarError::BadRequest(format!("Invalid time_max: {e}")))
        })
        .transpose()?;

    let order_by = payload
        .order_by
        .as_deref()
        .map(|s| match s {
            "startTime" => Ok(hypr_google_calendar::EventOrderBy::StartTime),
            "updated" => Ok(hypr_google_calendar::EventOrderBy::Updated),
            other => Err(CalendarError::BadRequest(format!(
                "Invalid order_by: {other}"
            ))),
        })
        .transpose()?;

    let req = hypr_google_calendar::ListEventsRequest {
        calendar_id: payload.calendar_id,
        time_min,
        time_max,
        max_results: payload.max_results,
        page_token: payload.page_token,
        single_events: payload.single_events,
        order_by,
        show_deleted: None,
        show_hidden_invitations: None,
        updated_min: None,
        i_cal_uid: None,
        q: None,
        sync_token: None,
        time_zone: None,
        event_types: None,
    };

    let response = client
        .list_events(req)
        .await
        .map_err(|e| CalendarError::Internal(e.to_string()))?;

    let events: Vec<serde_json::Value> = response
        .items
        .iter()
        .map(|e| serde_json::to_value(e).unwrap_or_default())
        .collect();

    Ok(Json(ListEventsResponse {
        events,
        next_page_token: response.next_page_token,
    }))
}

#[utoipa::path(
    post,
    path = "/events/create",
    request_body = CreateEventRequest,
    responses(
        (status = 200, description = "Event created", body = CreateEventResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "calendar",
)]
pub async fn create_event(
    nango: NangoConnection<GoogleCalendar>,
    Json(payload): Json<CreateEventRequest>,
) -> Result<Json<CreateEventResponse>> {
    let client = hypr_google_calendar::GoogleCalendarClient::new(nango.into_http());

    let start = convert_event_datetime(payload.start, "start")?;
    let end = convert_event_datetime(payload.end, "end")?;

    let req = hypr_google_calendar::CreateEventRequest {
        calendar_id: payload.calendar_id,
        event: hypr_google_calendar::CreateEventBody {
            summary: payload.summary,
            start,
            end,
            description: payload.description,
            location: payload.location,
            attendees: payload.attendees.map(|attendees| {
                attendees
                    .into_iter()
                    .map(|a| hypr_google_calendar::Attendee {
                        id: None,
                        email: Some(a.email),
                        display_name: a.display_name,
                        organizer: None,
                        is_self: None,
                        resource: None,
                        optional: a.optional,
                        response_status: None,
                        comment: None,
                        additional_guests: None,
                    })
                    .collect()
            }),
            recurrence: None,
            transparency: None,
            visibility: None,
            color_id: None,
            conference_data: None,
            reminders: None,
            guests_can_invite_others: None,
            guests_can_modify: None,
            guests_can_see_other_guests: None,
            source: None,
            extended_properties: None,
            event_type: None,
        },
    };

    let event = client
        .create_event(req)
        .await
        .map_err(|e| CalendarError::Internal(e.to_string()))?;

    let event = serde_json::to_value(event).unwrap_or_default();

    Ok(Json(CreateEventResponse { event }))
}
