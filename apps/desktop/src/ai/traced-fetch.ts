import * as Sentry from "@sentry/react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import type { CharTask } from "@hypr/api-client";
import { commands as miscCommands } from "@hypr/plugin-misc";

import { CHAR_TASK_HEADER, DEVICE_FINGERPRINT_HEADER } from "~/shared/utils";

let cachedFingerprint: string | null = null;

const getFingerprint = async (): Promise<string | null> => {
  if (cachedFingerprint) return cachedFingerprint;

  const result = await miscCommands.getFingerprint();
  if (result.status === "ok") {
    cachedFingerprint = result.data;
    return cachedFingerprint;
  }
  return null;
};

export const tracedFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const method = init?.method ?? "GET";

  return Sentry.startSpan(
    {
      name: `HTTP ${method} ${new URL(url).pathname}`,
      op: "http.client",
      attributes: { "http.url": url, "http.method": method },
    },
    async (span) => {
      const headers = new Headers(init?.headers);

      const traceHeader = Sentry.spanToTraceHeader(span);
      const baggageHeader = Sentry.spanToBaggageHeader(span);

      headers.set("sentry-trace", traceHeader);
      if (baggageHeader) {
        headers.set("baggage", baggageHeader);
      }

      const fingerprint = await getFingerprint();
      if (fingerprint) {
        headers.set(DEVICE_FINGERPRINT_HEADER, fingerprint);
      }

      const response = await tauriFetch(input, { ...init, headers });

      span.setAttribute("http.status_code", response.status);

      return response;
    },
  );
};

export function createTracedFetch(task: CharTask): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set(CHAR_TASK_HEADER, task);
    return tracedFetch(input, { ...init, headers });
  };
}
