use hypr_google_calendar::GoogleCalendarClient;
use hypr_nango::OwnedNangoHttpClient;

use crate::error::CalendarError;
use crate::provider::{CreateEventResult, ListCalendarsResult, ListEventsResult};
use crate::routes::calendar::{CreateEventRequest, EventDateTime, ListEventsRequest};

pub struct GoogleAdapter {
    client: GoogleCalendarClient<OwnedNangoHttpClient>,
}

impl GoogleAdapter {
    pub fn new(http: OwnedNangoHttpClient) -> Self {
        Self {
            client: GoogleCalendarClient::new(http),
        }
    }

    pub async fn list_calendars(&self) -> Result<ListCalendarsResult, CalendarError> {
        let response = self
            .client
            .list_calendars()
            .await
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let calendars = response
            .items
            .iter()
            .map(|c| serde_json::to_value(c).unwrap_or_default())
            .collect();

        Ok(ListCalendarsResult { calendars })
    }

    pub async fn list_events(
        &self,
        req: ListEventsRequest,
    ) -> Result<ListEventsResult, CalendarError> {
        let time_min = req
            .time_min
            .as_deref()
            .map(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .map_err(|e| CalendarError::BadRequest(format!("Invalid time_min: {e}")))
            })
            .transpose()?;

        let time_max = req
            .time_max
            .as_deref()
            .map(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .map_err(|e| CalendarError::BadRequest(format!("Invalid time_max: {e}")))
            })
            .transpose()?;

        let order_by = req
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

        let google_req = hypr_google_calendar::ListEventsRequest {
            calendar_id: req.calendar_id,
            time_min,
            time_max,
            max_results: req.max_results,
            page_token: req.page_token,
            single_events: req.single_events,
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

        let response = self
            .client
            .list_events(google_req)
            .await
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let events = response
            .items
            .iter()
            .map(|e| serde_json::to_value(e).unwrap_or_default())
            .collect();

        Ok(ListEventsResult {
            events,
            next_page_token: response.next_page_token,
        })
    }

    pub async fn create_event(
        &self,
        req: CreateEventRequest,
    ) -> Result<CreateEventResult, CalendarError> {
        let start = convert_event_datetime(req.start, "start")?;
        let end = convert_event_datetime(req.end, "end")?;

        let google_req = hypr_google_calendar::CreateEventRequest {
            calendar_id: req.calendar_id,
            event: hypr_google_calendar::CreateEventBody {
                summary: req.summary,
                start,
                end,
                description: req.description,
                location: req.location,
                attendees: req.attendees.map(|attendees| {
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

        let event = self
            .client
            .create_event(google_req)
            .await
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let event = serde_json::to_value(event).unwrap_or_default();
        Ok(CreateEventResult { event })
    }
}

fn parse_date(s: &str, field: &str) -> Result<chrono::NaiveDate, CalendarError> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .map_err(|e| CalendarError::BadRequest(format!("Invalid {field}: {e}")))
}

fn parse_datetime(
    s: &str,
    field: &str,
) -> Result<chrono::DateTime<chrono::FixedOffset>, CalendarError> {
    chrono::DateTime::parse_from_rfc3339(s)
        .map_err(|e| CalendarError::BadRequest(format!("Invalid {field}: {e}")))
}

fn convert_event_datetime(
    dt: EventDateTime,
    prefix: &str,
) -> Result<hypr_google_calendar::EventDateTime, CalendarError> {
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
