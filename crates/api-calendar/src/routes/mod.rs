pub(crate) mod calendar;

use axum::{Router, routing::post};

use crate::config::CalendarConfig;
use crate::state::AppState;

pub use calendar::ListEventsResponse;

pub fn router(config: CalendarConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/calendars", post(calendar::list_calendars))
        .route("/events", post(calendar::list_events))
        .route("/events/create", post(calendar::create_event))
        .with_state(state)
}
