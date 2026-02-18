use axum::Json;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::Result;
use crate::provider::CalendarClient;

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
pub async fn list_calendars(client: CalendarClient) -> Result<Json<ListCalendarsResponse>> {
    let result = client.list_calendars().await?;
    Ok(Json(ListCalendarsResponse {
        calendars: result.calendars,
    }))
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
    client: CalendarClient,
    Json(payload): Json<ListEventsRequest>,
) -> Result<Json<ListEventsResponse>> {
    let result = client.list_events(payload).await?;
    Ok(Json(ListEventsResponse {
        events: result.events,
        next_page_token: result.next_page_token,
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
    client: CalendarClient,
    Json(payload): Json<CreateEventRequest>,
) -> Result<Json<CreateEventResponse>> {
    let result = client.create_event(payload).await?;
    Ok(Json(CreateEventResponse {
        event: result.event,
    }))
}
