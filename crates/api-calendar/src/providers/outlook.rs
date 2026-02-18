use hypr_nango::OwnedNangoHttpClient;
use hypr_outlook_calendar::OutlookCalendarClient;

use crate::error::CalendarError;
use crate::provider::{CreateEventResult, ListCalendarsResult, ListEventsResult};
use crate::routes::calendar::{CreateEventRequest, ListEventsRequest};

pub struct OutlookAdapter {
    client: OutlookCalendarClient<OwnedNangoHttpClient>,
}

impl OutlookAdapter {
    pub fn new(http: OwnedNangoHttpClient) -> Self {
        Self {
            client: OutlookCalendarClient::new(http),
        }
    }

    pub async fn list_calendars(&self) -> Result<ListCalendarsResult, CalendarError> {
        let response = self
            .client
            .list_calendars()
            .await
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let calendars = response
            .value
            .iter()
            .map(|c| serde_json::to_value(c).unwrap_or_default())
            .collect();

        Ok(ListCalendarsResult { calendars })
    }

    pub async fn list_events(
        &self,
        req: ListEventsRequest,
    ) -> Result<ListEventsResult, CalendarError> {
        let start_date_time = req
            .time_min
            .as_deref()
            .map(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .map_err(|e| CalendarError::BadRequest(format!("Invalid time_min: {e}")))
            })
            .transpose()?;

        let end_date_time = req
            .time_max
            .as_deref()
            .map(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .map_err(|e| CalendarError::BadRequest(format!("Invalid time_max: {e}")))
            })
            .transpose()?;

        let order_by = req.order_by.as_deref().map(|s| match s {
            "startTime" => "start/dateTime".to_string(),
            "updated" => "lastModifiedDateTime".to_string(),
            other => other.to_string(),
        });

        let outlook_req = hypr_outlook_calendar::ListEventsRequest {
            calendar_id: req.calendar_id,
            start_date_time,
            end_date_time,
            top: req.max_results,
            skip: None,
            filter: None,
            select: None,
            order_by,
        };

        let response = self
            .client
            .list_events(outlook_req)
            .await
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let events = response
            .value
            .iter()
            .map(|e| serde_json::to_value(e).unwrap_or_default())
            .collect();

        Ok(ListEventsResult {
            events,
            next_page_token: response.odata_next_link,
        })
    }

    pub async fn create_event(
        &self,
        req: CreateEventRequest,
    ) -> Result<CreateEventResult, CalendarError> {
        let start = convert_to_outlook_datetime(&req.start)?;
        let end = convert_to_outlook_datetime(&req.end)?;

        let outlook_req = hypr_outlook_calendar::CreateEventRequest {
            calendar_id: req.calendar_id,
            event: hypr_outlook_calendar::CreateEventBody {
                subject: req.summary,
                start,
                end,
                body: req.description.map(|d| hypr_outlook_calendar::ItemBody {
                    content_type: Some(hypr_outlook_calendar::BodyType::Text),
                    content: Some(d),
                }),
                location: req.location.map(|l| hypr_outlook_calendar::Location {
                    display_name: Some(l),
                    location_type: None,
                    unique_id: None,
                    unique_id_type: None,
                    address: None,
                    coordinates: None,
                }),
                attendees: req.attendees.map(|attendees| {
                    attendees
                        .into_iter()
                        .map(|a| hypr_outlook_calendar::Attendee {
                            type_: None,
                            status: None,
                            email_address: Some(hypr_outlook_calendar::EmailAddress {
                                name: a.display_name,
                                address: Some(a.email),
                            }),
                        })
                        .collect()
                }),
                is_all_day: None,
                importance: None,
                sensitivity: None,
                show_as: None,
                categories: None,
                recurrence: None,
                is_online_meeting: None,
                online_meeting_provider: None,
                is_reminder_on: None,
                reminder_minutes_before_start: None,
                response_requested: None,
                allow_new_time_proposals: None,
                hide_attendees: None,
            },
        };

        let event = self
            .client
            .create_event(outlook_req)
            .await
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let event = serde_json::to_value(event).unwrap_or_default();
        Ok(CreateEventResult { event })
    }
}

fn convert_to_outlook_datetime(
    dt: &crate::routes::calendar::EventDateTime,
) -> Result<hypr_outlook_calendar::DateTimeTimeZone, CalendarError> {
    if let Some(ref date_time_str) = dt.date_time {
        let parsed = chrono::DateTime::parse_from_rfc3339(date_time_str)
            .map_err(|e| CalendarError::BadRequest(format!("Invalid dateTime: {e}")))?;

        let time_zone = dt
            .time_zone
            .clone()
            .unwrap_or_else(|| parsed.timezone().to_string());

        let local = parsed.naive_local().format("%Y-%m-%dT%H:%M:%S").to_string();

        Ok(hypr_outlook_calendar::DateTimeTimeZone {
            date_time: local,
            time_zone: Some(time_zone),
        })
    } else if let Some(ref date_str) = dt.date {
        Ok(hypr_outlook_calendar::DateTimeTimeZone {
            date_time: format!("{date_str}T00:00:00"),
            time_zone: dt.time_zone.clone(),
        })
    } else {
        Err(CalendarError::BadRequest(
            "Either date or dateTime must be provided".into(),
        ))
    }
}
