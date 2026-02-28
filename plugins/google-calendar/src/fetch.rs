use hypr_google_calendar::{CalendarListEntry, Event};

use crate::types::EventFilter;

fn make_client(api_base_url: &str, access_token: &str) -> Result<hypr_api_client::Client, String> {
    let auth_value = format!("Bearer {access_token}")
        .parse()
        .map_err(|e: reqwest::header::InvalidHeaderValue| e.to_string())?;
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(reqwest::header::AUTHORIZATION, auth_value);
    let http = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(hypr_api_client::Client::new_with_client(api_base_url, http))
}

pub async fn list_calendars(
    api_base_url: &str,
    access_token: &str,
) -> Result<Vec<CalendarListEntry>, String> {
    let client = make_client(api_base_url, access_token)?;

    let response = client
        .google_list_calendars()
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.into_inner().items)
}

pub async fn list_events(
    api_base_url: &str,
    access_token: &str,
    filter: EventFilter,
) -> Result<Vec<Event>, String> {
    let client = make_client(api_base_url, access_token)?;

    let body = hypr_api_client::types::GoogleListEventsRequest {
        calendar_id: filter.calendar_tracking_id,
        time_min: Some(filter.from.to_rfc3339()),
        time_max: Some(filter.to.to_rfc3339()),
        max_results: None,
        page_token: None,
        single_events: Some(true),
        order_by: Some("startTime".to_string()),
    };

    let response = client
        .google_list_events(&body)
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.into_inner().items)
}
