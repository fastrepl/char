pub(crate) mod calendar;

use std::sync::Arc;

use axum::{Router, routing::post};

pub use calendar::ListEventsResponse;

use crate::provider::CalendarConfig;

pub fn router(config: CalendarConfig) -> Router {
    Router::new()
        .route("/calendars", post(calendar::list_calendars))
        .route("/events", post(calendar::list_events))
        .route("/events/create", post(calendar::create_event))
        .layer(axum::Extension(Arc::new(config)))
}
