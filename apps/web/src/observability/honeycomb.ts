import {
  HoneycombWebSDK,
  WebVitalsInstrumentation,
} from "@honeycombio/opentelemetry-web";
import { trace } from "@opentelemetry/api";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { resourceFromAttributes } from "@opentelemetry/resources";

import { env } from "../env";

type HoneycombTraceContext = {
  spanId: string;
  traceId: string;
};

let sdkStarted = false;

function getApiTraceTargets() {
  try {
    const apiOrigin = new URL(env.VITE_API_URL).origin;
    const escapedApiOrigin = apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [new RegExp(`^${escapedApiOrigin}(?:/|$)`, "i")];
  } catch {
    return [env.VITE_API_URL];
  }
}

function parseOtlpHeaders(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const headers = Object.fromEntries(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");
        if (separatorIndex === -1) {
          return null;
        }

        const key = entry.slice(0, separatorIndex).trim();
        const headerValue = entry.slice(separatorIndex + 1).trim();
        if (!key || !headerValue) {
          return null;
        }

        return [key, headerValue];
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function getAutoInstrumentationOptions() {
  const traceTargets = getApiTraceTargets();
  const configDefaults = {
    clearTimingResources: true,
    ignoreNetworkEvents: true,
    propagateTraceHeaderCorsUrls: traceTargets,
  };

  return {
    "@opentelemetry/instrumentation-fetch": configDefaults,
    "@opentelemetry/instrumentation-xml-http-request": configDefaults,
  };
}

export function initHoneycombWeb() {
  if (
    sdkStarted ||
    typeof window === "undefined" ||
    !env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT
  ) {
    return;
  }

  const headers = parseOtlpHeaders(env.VITE_OTEL_EXPORTER_OTLP_HEADERS);
  const instrumentations = getWebAutoInstrumentations(
    getAutoInstrumentationOptions(),
  );

  const sdk = new HoneycombWebSDK({
    endpoint: env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
    headers,
    serviceName: "web",
    serviceVersion: env.VITE_APP_VERSION,
    skipOptionsValidation: true,
    localVisualizations: import.meta.env.DEV,
    debug: import.meta.env.DEV,
    disableDefaultMetricExporter: true,
    instrumentations: [instrumentations, new WebVitalsInstrumentation()],
    resource: resourceFromAttributes({
      "deployment.environment": import.meta.env.MODE,
      "service.name": "web",
      "service.namespace": "hyprnote",
      "service.version": env.VITE_APP_VERSION ?? "unknown",
    }),
  });

  sdk.start();
  sdkStarted = true;
}

export function getActiveHoneycombTraceContext(): HoneycombTraceContext | null {
  const span = trace.getActiveSpan();
  if (!span) {
    return null;
  }

  const spanContext = span.spanContext();
  if (!spanContext.traceId || !spanContext.spanId) {
    return null;
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

export function getHoneycombTraceUrl(traceContext: HoneycombTraceContext) {
  if (!env.VITE_HONEYCOMB_UI_TEAM || !env.VITE_HONEYCOMB_UI_ENVIRONMENT) {
    return null;
  }

  const baseUrl = env.VITE_HONEYCOMB_UI_BASE_URL ?? "https://ui.honeycomb.io";
  const url = new URL(
    `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(
      env.VITE_HONEYCOMB_UI_TEAM,
    )}/environments/${encodeURIComponent(
      env.VITE_HONEYCOMB_UI_ENVIRONMENT,
    )}/trace`,
  );

  url.searchParams.set("trace_id", traceContext.traceId);
  url.searchParams.set("span", traceContext.spanId);
  url.searchParams.set(
    "trace_start_ts",
    Math.floor(Date.now() / 1000).toString(),
  );

  return url.toString();
}
