use hypr_google_calendar::{CalendarListEntry, Event};

use crate::types::EventFilter;

pub async fn list_calendars(
    client: &reqwest::Client,
    api_base_url: &str,
    access_token: &str,
) -> Result<Vec<CalendarListEntry>, String> {
    let url = format!("{}/calendar/calendars", api_base_url.trim_end_matches('/'));
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let body: hypr_api_client::types::ListCalendarsResponse =
        response.json().await.map_err(|e| e.to_string())?;

    Ok(body
        .calendars
        .iter()
        .filter_map(|v| serde_json::from_value::<CalendarListEntry>(v.clone()).ok())
        .collect())
}

pub async fn list_events(
    client: &reqwest::Client,
    api_base_url: &str,
    access_token: &str,
    filter: EventFilter,
) -> Result<Vec<Event>, String> {
    let url = format!("{}/calendar/events", api_base_url.trim_end_matches('/'));

    let body = hypr_api_client::types::ListEventsRequest {
        calendar_id: filter.calendar_tracking_id.clone(),
        time_min: Some(filter.from.to_rfc3339()),
        time_max: Some(filter.to.to_rfc3339()),
        max_results: None,
        page_token: None,
        single_events: Some(true),
        order_by: Some("startTime".to_string()),
    };

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let err_body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, err_body));
    }

    let res: hypr_api_client::types::ListEventsResponse =
        response.json().await.map_err(|e| e.to_string())?;

    Ok(res
        .events
        .iter()
        .filter_map(|v| serde_json::from_value::<Event>(v.clone()).ok())
        .filter(|e| {
            let (start, end) = match (&e.start, &e.end) {
                (Some(s), Some(ed)) => {
                    let start_utc = s
                        .date
                        .as_ref()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
                        .or_else(|| {
                            s.date_time
                                .as_ref()
                                .map(|dt| dt.with_timezone(&chrono::Utc))
                        });
                    let end_utc = ed
                        .date
                        .as_ref()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
                        .or_else(|| {
                            ed.date_time
                                .as_ref()
                                .map(|dt| dt.with_timezone(&chrono::Utc))
                        });
                    let (Some(s), Some(e)) = (start_utc, end_utc) else {
                        return false;
                    };
                    (s, e)
                }
                _ => return false,
            };
            start < filter.to && end > filter.from
        })
        .collect())
}
