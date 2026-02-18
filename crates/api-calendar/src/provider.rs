use std::sync::Arc;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use hypr_api_nango::{GoogleCalendar, NangoConnection, NangoConnectionError};

use crate::error::CalendarError;
use crate::providers::google::GoogleAdapter;
use crate::providers::outlook::OutlookAdapter;

struct OutlookCalendarIntegration;

impl hypr_api_nango::NangoIntegrationId for OutlookCalendarIntegration {
    const ID: &'static str = "outlook-calendar";
}

pub struct ListCalendarsResult {
    pub calendars: Vec<serde_json::Value>,
}

pub struct ListEventsResult {
    pub events: Vec<serde_json::Value>,
    pub next_page_token: Option<String>,
}

pub struct CreateEventResult {
    pub event: serde_json::Value,
}

#[derive(Clone)]
pub struct CalendarConfig {
    google: bool,
    outlook: bool,
}

impl CalendarConfig {
    pub fn builder() -> CalendarConfigBuilder {
        CalendarConfigBuilder {
            google: false,
            outlook: false,
        }
    }
}

pub struct CalendarConfigBuilder {
    google: bool,
    outlook: bool,
}

impl CalendarConfigBuilder {
    pub fn google(mut self) -> Self {
        self.google = true;
        self
    }

    pub fn outlook(mut self) -> Self {
        self.outlook = true;
        self
    }

    pub fn build(self) -> CalendarConfig {
        CalendarConfig {
            google: self.google,
            outlook: self.outlook,
        }
    }
}

pub enum CalendarClient {
    Google(GoogleAdapter),
    Outlook(OutlookAdapter),
}

impl CalendarClient {
    pub async fn list_calendars(&self) -> Result<ListCalendarsResult, CalendarError> {
        match self {
            Self::Google(a) => a.list_calendars().await,
            Self::Outlook(a) => a.list_calendars().await,
        }
    }

    pub async fn list_events(
        &self,
        req: crate::routes::calendar::ListEventsRequest,
    ) -> Result<ListEventsResult, CalendarError> {
        match self {
            Self::Google(a) => a.list_events(req).await,
            Self::Outlook(a) => a.list_events(req).await,
        }
    }

    pub async fn create_event(
        &self,
        req: crate::routes::calendar::CreateEventRequest,
    ) -> Result<CreateEventResult, CalendarError> {
        match self {
            Self::Google(a) => a.create_event(req).await,
            Self::Outlook(a) => a.create_event(req).await,
        }
    }
}

impl<S: Send + Sync> FromRequestParts<S> for CalendarClient {
    type Rejection = CalendarError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let config = parts
            .extensions
            .get::<Arc<CalendarConfig>>()
            .ok_or(CalendarError::Internal("missing CalendarConfig".into()))?
            .clone();

        if config.google {
            match NangoConnection::<GoogleCalendar>::from_request_parts(parts, state).await {
                Ok(conn) => {
                    return Ok(CalendarClient::Google(GoogleAdapter::new(conn.into_http())));
                }
                Err(NangoConnectionError::NotConnected(_)) => {}
                Err(e) => return Err(CalendarError::NangoConnection(e)),
            }
        }

        if config.outlook {
            match NangoConnection::<OutlookCalendarIntegration>::from_request_parts(parts, state)
                .await
            {
                Ok(conn) => {
                    return Ok(CalendarClient::Outlook(OutlookAdapter::new(
                        conn.into_http(),
                    )));
                }
                Err(NangoConnectionError::NotConnected(_)) => {}
                Err(e) => return Err(CalendarError::NangoConnection(e)),
            }
        }

        Err(CalendarError::BadRequest(
            "No calendar provider connected".into(),
        ))
    }
}
