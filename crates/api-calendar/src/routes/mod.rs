pub(crate) mod calendar;

use axum::{Router, routing::post};

pub use calendar::ListEventsResponse;

pub fn router() -> Router {
    Router::new()
        .route("/calendars", post(calendar::list_calendars))
        .route("/events", post(calendar::list_events))
        .route("/events/create", post(calendar::create_event))
}
