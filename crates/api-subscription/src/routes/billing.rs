use axum::{
    Extension,
    extract::{Query, State},
    response::{IntoResponse, Response},
};
use hypr_analytics::{AnalyticsClient, ToAnalyticsPayload};
use hypr_api_auth::AuthContext;

use crate::state::AppState;
use crate::stripe::{create_trial_subscription, get_or_create_customer};
use crate::trial::{Interval, StartTrialQuery, StartTrialResponse, TrialOutcome};

#[utoipa::path(
    post,
    path = "/start-trial",
    params(StartTrialQuery),
    responses(
        (status = 200, description = "Trial started successfully", body = StartTrialResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
)]
pub async fn start_trial(
    State(state): State<AppState>,
    Query(query): Query<StartTrialQuery>,
    Extension(auth): Extension<AuthContext>,
) -> Response {
    let user_id = &auth.claims.sub;

    let can_start: bool = match state
        .supabase
        .rpc("can_start_trial", &auth.token, None)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(error = %e, "can_start_trial RPC failed in start-trial");
            return emit_and_respond(
                state.config.analytics.as_deref(),
                user_id,
                TrialOutcome::RpcError,
            )
            .await;
        }
    };

    let outcome =
        if !can_start {
            TrialOutcome::NotEligible
        } else {
            let customer_id =
                match get_or_create_customer(&state.supabase, &state.stripe, &auth.token, user_id)
                    .await
                {
                    Ok(Some(id)) => id,
                    Ok(None) => {
                        return emit_and_respond(
                            state.config.analytics.as_deref(),
                            user_id,
                            TrialOutcome::CustomerError,
                        )
                        .await;
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "get_or_create_customer failed");
                        sentry::capture_message(&e.to_string(), sentry::Level::Error);
                        return emit_and_respond(
                            state.config.analytics.as_deref(),
                            user_id,
                            TrialOutcome::CustomerError,
                        )
                        .await;
                    }
                };

            let price_id = match query.interval {
                Interval::Monthly => &state.config.stripe.stripe_monthly_price_id,
                Interval::Yearly => &state.config.stripe.stripe_yearly_price_id,
            };

            match create_trial_subscription(&state.stripe, &customer_id, price_id, user_id).await {
                Ok(()) => TrialOutcome::Started(query.interval),
                Err(e) => {
                    tracing::error!(error = %e, "failed to create Stripe subscription");
                    sentry::capture_message(&e.to_string(), sentry::Level::Error);
                    TrialOutcome::StripeError
                }
            }
        };

    emit_and_respond(state.config.analytics.as_deref(), user_id, outcome).await
}

async fn emit_and_respond<O>(
    analytics: Option<&AnalyticsClient>,
    user_id: &str,
    outcome: O,
) -> Response
where
    O: IntoResponse + ToAnalyticsPayload,
{
    if let Some(analytics) = analytics {
        let _ = analytics
            .event(user_id, outcome.to_analytics_payload())
            .await;
        if let Some(props) = outcome.to_analytics_properties() {
            let _ = analytics.set_properties(user_id, props).await;
        }
    }
    outcome.into_response()
}
