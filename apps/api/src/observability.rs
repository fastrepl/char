use opentelemetry::KeyValue;
use opentelemetry::global;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::Resource;
use opentelemetry_sdk::trace::SdkTracerProvider;
use tracing_subscriber::prelude::*;

pub struct ObservabilityGuard {
    otel_provider: Option<SdkTracerProvider>,
}

pub fn init(service_name: &str, env: &crate::env::Env) -> ObservabilityGuard {
    hypr_observability::install_trace_context_propagator();
    let otel_provider = init_otel_tracer_provider(service_name, env);
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info,tower_http=debug".into());

    if let Some(provider) = otel_provider.as_ref() {
        let tracer = provider.tracer(service_name.to_string());
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer())
            .with(tracing_opentelemetry::layer().with_tracer(tracer))
            .with(sentry::integrations::tracing::layer())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer())
            .with(sentry::integrations::tracing::layer())
            .init();
    }

    ObservabilityGuard { otel_provider }
}

impl ObservabilityGuard {
    pub fn shutdown(self) {
        if let Some(provider) = self.otel_provider
            && let Err(e) = provider.shutdown()
        {
            tracing::warn!(error.message = %e, "otel_tracer_shutdown_failed");
        }
    }
}

fn init_otel_tracer_provider(
    service_name: &str,
    env: &crate::env::Env,
) -> Option<SdkTracerProvider> {
    let Some(endpoint) = env.otel_exporter_otlp_endpoint.as_ref() else {
        return None;
    };

    let exporter_builder = opentelemetry_otlp::SpanExporter::builder()
        .with_tonic()
        .with_endpoint(endpoint);
    if env.otel_exporter_otlp_headers.is_none() {
        tracing::warn!(
            "otel_exporter_otlp_headers not set; exporter auth depends on OTEL_EXPORTER_OTLP_HEADERS"
        );
    }
    let exporter = exporter_builder.build().ok()?;

    let configured_service_name = env
        .otel_service_name
        .clone()
        .unwrap_or_else(|| service_name.to_string());
    let environment = if cfg!(debug_assertions) {
        "development"
    } else {
        "production"
    };
    let version = option_env!("APP_VERSION").unwrap_or("unknown");

    let resource = Resource::builder_empty()
        .with_attributes([
            KeyValue::new("service.namespace", "hyprnote"),
            KeyValue::new("service.name", configured_service_name),
            KeyValue::new("service.version", version.to_string()),
            KeyValue::new("deployment.environment", environment),
        ])
        .build();

    let provider = SdkTracerProvider::builder()
        .with_batch_exporter(exporter)
        .with_resource(resource)
        .build();

    global::set_tracer_provider(provider.clone());
    Some(provider)
}
