mod auth;
mod env;
mod openapi;
mod rate_limit;

use std::net::SocketAddr;
use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::Duration;

use axum::{Router, body::Body, extract::MatchedPath, http::Request, middleware};
use sentry::integrations::tower::{NewSentryLayer, SentryHttpLayer};
use tower::ServiceBuilder;
use tower_http::{
    classify::ServerErrorsFailureClass,
    cors::{self, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::prelude::*;

use auth::AuthState;
use env::env;

use crate::env::Env;

pub const DEVICE_FINGERPRINT_HEADER: &str = "x-device-fingerprint";

async fn app() -> Router {
    let env = env();

    let analytics = build_analytics_client(&env);

    let llm_config =
        hypr_llm_proxy::LlmProxyConfig::new(&env.llm).with_analytics(analytics.clone());
    let stt_config = hypr_transcribe_proxy::SttProxyConfig::new(&env.stt, &env.supabase)
        .with_hyprnote_routing(hypr_transcribe_proxy::HyprnoteRoutingConfig::default())
        .with_analytics(analytics.clone());

    let stt_rate_limit = rate_limit::RateLimitState::builder()
        .pro(
            governor::Quota::with_period(Duration::from_mins(5))
                .unwrap()
                .allow_burst(NonZeroU32::new(20).unwrap()),
        )
        .free(
            governor::Quota::with_period(Duration::from_hours(24))
                .unwrap()
                .allow_burst(NonZeroU32::new(3).unwrap()),
        )
        .build();
    let llm_rate_limit = rate_limit::RateLimitState::builder()
        .pro(
            governor::Quota::with_period(Duration::from_secs(1))
                .unwrap()
                .allow_burst(NonZeroU32::new(30).unwrap()),
        )
        .free(
            governor::Quota::with_period(Duration::from_hours(12))
                .unwrap()
                .allow_burst(NonZeroU32::new(5).unwrap()),
        )
        .build();

    let auth_state_pro =
        AuthState::new(&env.supabase.supabase_url).with_required_entitlement("hyprnote_pro");
    let auth_state_basic = AuthState::new(&env.supabase.supabase_url);
    let auth_state_support = AuthState::new(&env.supabase.supabase_url);

    let nango_config = hypr_api_nango::NangoConfig::new(
        &env.nango,
        &env.supabase,
        Some(env.supabase.supabase_service_role_key.clone()),
    );
    let nango_connection_state = hypr_api_nango::NangoConnectionState::from_config(&nango_config);
    let subscription_config =
        hypr_api_subscription::SubscriptionConfig::new(&env.supabase, &env.stripe, &env.loops)
            .with_analytics(analytics.clone());
    let support_config = hypr_api_support::SupportConfig::new(
        &env.github_app,
        &env.llm,
        &env.support_database,
        &env.stripe,
        &env.supabase,
        &env.chatwoot,
        auth_state_support.clone(),
    );
    let research_config = hypr_api_research::ResearchConfig {
        exa_api_key: env.exa_api_key.clone(),
        jina_api_key: env.jina_api_key.clone(),
    };

    let webhook_routes = Router::new()
        .nest(
            "/nango",
            hypr_api_nango::webhook_router(nango_config.clone()),
        )
        .nest(
            "/stt",
            hypr_transcribe_proxy::callback_router(stt_config.clone()),
        );

    let auth_state_integration =
        AuthState::new(&env.supabase.supabase_url).with_required_entitlement("hyprnote_pro");

    let pro_routes = Router::new()
        .merge(hypr_api_research::router(research_config))
        .route_layer(middleware::from_fn(auth::sentry_and_analytics))
        .route_layer(middleware::from_fn_with_state(
            auth_state_pro,
            auth::require_auth,
        ));

    let calendar_config = hypr_api_calendar::CalendarConfig {
        google: true,
        ..Default::default()
    };

    let integration_routes = Router::new()
        .nest("/calendar", hypr_api_calendar::router(calendar_config))
        .nest("/nango", hypr_api_nango::router(nango_config.clone()))
        .layer(axum::Extension(nango_connection_state))
        .route_layer(middleware::from_fn(auth::sentry_and_analytics))
        .route_layer(middleware::from_fn_with_state(
            auth_state_integration,
            auth::require_auth,
        ));

    let stt_routes = Router::new()
        .merge(hypr_transcribe_proxy::listen_router(stt_config.clone()))
        .nest("/stt", hypr_transcribe_proxy::router(stt_config))
        .route_layer(middleware::from_fn_with_state(
            stt_rate_limit,
            rate_limit::rate_limit,
        ));

    let llm_routes = Router::new()
        .merge(hypr_llm_proxy::chat_completions_router(llm_config.clone()))
        .nest("/llm", hypr_llm_proxy::router(llm_config))
        .route_layer(middleware::from_fn_with_state(
            llm_rate_limit,
            rate_limit::rate_limit,
        ));

    let subscription_router = hypr_api_subscription::router(subscription_config);
    let auth_routes = Router::new()
        .merge(stt_routes)
        .merge(llm_routes)
        .nest("/subscription", subscription_router.clone())
        .nest("/rpc", subscription_router.clone())
        .nest("/billing", subscription_router)
        .route_layer(middleware::from_fn(auth::sentry_and_analytics))
        .route_layer(middleware::from_fn_with_state(
            auth_state_basic,
            auth::require_auth,
        ));

    let support_routes = Router::new()
        .merge(hypr_api_support::router(support_config).await)
        .layer(middleware::from_fn_with_state(
            auth_state_support.clone(),
            auth::optional_auth,
        ));

    Router::new()
        .route("/health", axum::routing::get(version))
        .route("/openapi.json", axum::routing::get(openapi_json))
        .merge(support_routes)
        .merge(webhook_routes)
        .merge(pro_routes)
        .merge(integration_routes)
        .merge(auth_routes)
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        )
        .layer(
            ServiceBuilder::new()
                .layer(NewSentryLayer::<Request<Body>>::new_from_top())
                .layer(SentryHttpLayer::new().enable_transaction())
                .layer(
                    TraceLayer::new_for_http()
                        .make_span_with(|request: &Request<Body>| {
                            let path = request.uri().path();

                            if path == "/health" {
                                return tracing::Span::none();
                            }

                            let method = request.method();
                            let matched_path = request
                                .extensions()
                                .get::<MatchedPath>()
                                .map(MatchedPath::as_str)
                                .unwrap_or(path);
                            let (service, span_op) = match path {
                                p if p.starts_with("/llm")
                                    || p.starts_with("/chat/completions") =>
                                {
                                    ("llm", "http.server.llm")
                                }
                                p if p.starts_with("/stt") || p.starts_with("/listen") => {
                                    ("stt", "http.server.stt")
                                }
                                _ => ("unknown", "http.server"),
                            };

                            tracing::info_span!(
                                "http_request",
                                method = %method,
                                http.route = %matched_path,
                                service = %service,
                                otel.name = %format!("{} {}", method, matched_path),
                                span.op = %span_op,
                            )
                        })
                        .on_request(|request: &Request<Body>, _span: &tracing::Span| {
                            // Skip logging for health checks
                            if request.uri().path() == "/health" {
                                return;
                            }
                            tracing::info!(
                                method = %request.method(),
                                path = %request.uri().path(),
                                "http_request_started"
                            );
                        })
                        .on_response(
                            |response: &axum::http::Response<axum::body::Body>,
                             latency: std::time::Duration,
                             span: &tracing::Span| {
                                if span.is_disabled() {
                                    return;
                                }
                                tracing::info!(
                                    parent: span,
                                    http_status = %response.status().as_u16(),
                                    latency_ms = %latency.as_millis(),
                                    "http_request_finished"
                                );
                            },
                        )
                        .on_failure(
                            |failure_class: ServerErrorsFailureClass,
                             latency: std::time::Duration,
                             span: &tracing::Span| {
                                if span.is_disabled() {
                                    return;
                                }
                                tracing::error!(
                                    parent: span,
                                    failure_class = ?failure_class,
                                    latency_ms = %latency.as_millis(),
                                    "http_request_failed"
                                );
                            },
                        ),
                ),
        )
}

fn build_analytics_client(env: &Env) -> Arc<hypr_analytics::AnalyticsClient> {
    let mut builder = hypr_analytics::AnalyticsClientBuilder::default();
    if cfg!(debug_assertions) {
        tracing::info!("analytics: dev mode, printing events as tracing");
    } else {
        let key = env
            .posthog_api_key
            .as_ref()
            .expect("POSTHOG_API_KEY is required in production");
        builder = builder.with_posthog(key);
    }
    Arc::new(builder.build())
}

fn main() -> std::io::Result<()> {
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

    let _ = openapi::write_openapi_json();

    let env = env();

    let _guard = sentry::init(sentry::ClientOptions {
        dsn: env.sentry_dsn.as_ref().and_then(|s| s.parse().ok()),
        release: option_env!("APP_VERSION").map(|v| format!("hyprnote-api@{}", v).into()),
        environment: Some(
            if cfg!(debug_assertions) {
                "development"
            } else {
                "production"
            }
            .into(),
        ),
        traces_sample_rate: 1.0,
        sample_rate: 1.0,
        send_default_pii: true,
        auto_session_tracking: true,
        session_mode: sentry::SessionMode::Request,
        attach_stacktrace: true,
        max_breadcrumbs: 100,
        ..Default::default()
    });

    sentry::configure_scope(|scope| {
        scope.set_tag("service", "hyprnote-api");
    });

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .with(sentry::integrations::tracing::layer())
        .init();

    hypr_transcribe_proxy::ApiKeys::from(&env.stt.stt).log_configured_providers();

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async {
            let addr = SocketAddr::from(([0, 0, 0, 0], env.port));
            tracing::info!(addr = %addr, "server_listening");

            let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
            axum::serve(listener, app().await)
                .with_graceful_shutdown(shutdown_signal())
                .await
                .unwrap();
        });

    if let Some(client) = sentry::Hub::current().client() {
        client.close(Some(Duration::from_secs(2)));
    }

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install CTRL+C signal handler");
    tracing::info!("shutdown_signal_received");
}

async fn openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(openapi::openapi())
}

async fn version() -> &'static str {
    option_env!("VERGEN_GIT_SHA").unwrap_or("unknown")
}
