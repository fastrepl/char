use utoipa::OpenApi;

use crate::routes::ListEventsResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::calendar::list_calendars,
        crate::routes::calendar::list_events,
        crate::routes::calendar::create_event,
    ),
    components(
        schemas(
            crate::routes::calendar::ListCalendarsRequest,
            crate::routes::calendar::ListCalendarsResponse,
            crate::routes::calendar::ListEventsRequest,
            ListEventsResponse,
            crate::routes::calendar::CreateEventRequest,
            crate::routes::calendar::CreateEventResponse,
            crate::routes::calendar::EventDateTime,
            crate::routes::calendar::EventAttendee,
        )
    ),
    tags(
        (name = "calendar", description = "Calendar management")
    )
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
