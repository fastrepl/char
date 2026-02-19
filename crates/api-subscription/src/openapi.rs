use utoipa::OpenApi;

use crate::routes::{
    CanStartTrialReason, CanStartTrialResponse, Interval, StartTrialReason, StartTrialResponse,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::rpc::can_start_trial,
        crate::routes::billing::start_trial,
    ),
    components(
        schemas(
            CanStartTrialResponse,
            CanStartTrialReason,
            StartTrialResponse,
            StartTrialReason,
            Interval,
        )
    ),
    tags(
        (name = "subscription", description = "Subscription and trial management")
    )
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
