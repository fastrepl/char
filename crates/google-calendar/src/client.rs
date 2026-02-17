use hypr_http::HttpClient;

use crate::error::Error;
use crate::types::{
    CreateEventRequest, GoogleEvent, ListCalendarsResponse, ListEventsRequest, ListEventsResponse,
};

pub struct GoogleCalendarClient<C> {
    http: C,
}

impl<C: HttpClient> GoogleCalendarClient<C> {
    pub fn new(http: C) -> Self {
        Self { http }
    }

    pub async fn list_calendars(&self) -> Result<ListCalendarsResponse, Error> {
        let bytes = self
            .http
            .get("/calendar/v3/users/me/calendarList")
            .await
            .map_err(Error::Http)?;
        let response: ListCalendarsResponse = serde_json::from_slice(&bytes)?;
        Ok(response)
    }

    pub async fn list_events(&self, req: ListEventsRequest) -> Result<ListEventsResponse, Error> {
        let calendar_id = &req.calendar_id;
        let path = format!("/calendar/v3/calendars/{calendar_id}/events");

        let mut query_parts: Vec<String> = Vec::new();

        if let Some(ref time_min) = req.time_min {
            query_parts.push(format!(
                "timeMin={}",
                urlencoding::encode(&time_min.to_rfc3339())
            ));
        }
        if let Some(ref time_max) = req.time_max {
            query_parts.push(format!(
                "timeMax={}",
                urlencoding::encode(&time_max.to_rfc3339())
            ));
        }
        if let Some(max_results) = req.max_results {
            query_parts.push(format!("maxResults={max_results}"));
        }
        if let Some(ref page_token) = req.page_token {
            query_parts.push(format!("pageToken={}", urlencoding::encode(page_token)));
        }
        if let Some(single_events) = req.single_events {
            query_parts.push(format!("singleEvents={single_events}"));
        }
        if let Some(ref order_by) = req.order_by {
            query_parts.push(format!("orderBy={}", urlencoding::encode(order_by)));
        }

        let full_path = if query_parts.is_empty() {
            path
        } else {
            format!("{}?{}", path, query_parts.join("&"))
        };

        let bytes = self.http.get(&full_path).await.map_err(Error::Http)?;
        let response: ListEventsResponse = serde_json::from_slice(&bytes)?;
        Ok(response)
    }

    pub async fn create_event(&self, req: CreateEventRequest) -> Result<GoogleEvent, Error> {
        let calendar_id = &req.calendar_id;
        let path = format!("/calendar/v3/calendars/{calendar_id}/events");

        let body = serde_json::to_vec(&req.event)?;
        let bytes = self.http.post(&path, body).await.map_err(Error::Http)?;
        let event: GoogleEvent = serde_json::from_slice(&bytes)?;
        Ok(event)
    }
}
