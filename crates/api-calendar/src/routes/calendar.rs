use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::{CalendarError, Result};
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListCalendarsRequest {
    pub connection_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListCalendarsResponse {
    pub calendars: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListEventsRequest {
    pub connection_id: String,
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
    pub connection_id: String,
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

#[utoipa::path(
    post,
    path = "/calendars",
    request_body = ListCalendarsRequest,
    responses(
        (status = 200, description = "Calendars fetched", body = ListCalendarsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "calendar",
)]
pub async fn list_calendars(
    State(state): State<AppState>,
    Json(payload): Json<ListCalendarsRequest>,
) -> Result<Json<ListCalendarsResponse>> {
    let proxy = state
        .nango
        .integration("google-calendar")
        .connection(&payload.connection_id);
    let http = hypr_nango::NangoHttpClient::new(proxy);
    let client = hypr_google_calendar::GoogleCalendarClient::new(http);

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
    State(state): State<AppState>,
    Json(payload): Json<ListEventsRequest>,
) -> Result<Json<ListEventsResponse>> {
    let proxy = state
        .nango
        .integration("google-calendar")
        .connection(&payload.connection_id);
    let http = hypr_nango::NangoHttpClient::new(proxy);
    let client = hypr_google_calendar::GoogleCalendarClient::new(http);

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

    let req = hypr_google_calendar::ListEventsRequest {
        calendar_id: payload.calendar_id,
        time_min,
        time_max,
        max_results: payload.max_results,
        page_token: payload.page_token,
        single_events: payload.single_events,
        order_by: payload.order_by,
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
    State(state): State<AppState>,
    Json(payload): Json<CreateEventRequest>,
) -> Result<Json<CreateEventResponse>> {
    let proxy = state
        .nango
        .integration("google-calendar")
        .connection(&payload.connection_id);
    let http = hypr_nango::NangoHttpClient::new(proxy);
    let client = hypr_google_calendar::GoogleCalendarClient::new(http);

    let req = hypr_google_calendar::CreateEventRequest {
        calendar_id: payload.calendar_id,
        event: hypr_google_calendar::CreateEventBody {
            summary: payload.summary,
            start: hypr_google_calendar::GoogleEventDateTime {
                date: payload.start.date,
                date_time: payload.start.date_time,
                time_zone: payload.start.time_zone,
            },
            end: hypr_google_calendar::GoogleEventDateTime {
                date: payload.end.date,
                date_time: payload.end.date_time,
                time_zone: payload.end.time_zone,
            },
            description: payload.description,
            location: payload.location,
            attendees: payload.attendees.map(|attendees| {
                attendees
                    .into_iter()
                    .map(|a| hypr_google_calendar::GoogleEventAttendee {
                        email: Some(a.email),
                        display_name: a.display_name,
                        response_status: None,
                        is_self: None,
                        organizer: None,
                        optional: a.optional,
                    })
                    .collect()
            }),
        },
    };

    let event = client
        .create_event(req)
        .await
        .map_err(|e| CalendarError::Internal(e.to_string()))?;

    let event = serde_json::to_value(event).unwrap_or_default();

    Ok(Json(CreateEventResponse { event }))
}
