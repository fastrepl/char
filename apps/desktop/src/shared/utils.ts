import { getIdentifier } from "@tauri-apps/api/app";

import { commands as deeplink2Commands } from "@hypr/plugin-deeplink2";

export const id = () => crypto.randomUUID() as string;

export const getScheme = async (): Promise<string> => {
  const id = await getIdentifier();
  const schemes: Record<string, string> = {
    "com.hyprnote.stable": "hyprnote",
    "com.hyprnote.nightly": "hyprnote-nightly",
    "com.hyprnote.staging": "hyprnote-staging",
    "com.hyprnote.dev": "hypr",
  };
  return schemes[id] ?? "hypr";
};

type DesktopFlowPath = "/auth" | "/app/integration" | "/app/checkout";

export const buildWebAppUrl = async (
  path: DesktopFlowPath,
  params?: Record<string, string>,
): Promise<string> => {
  const { env } = await import("~/env");

  const scheme = await getScheme();
  const result = await deeplink2Commands.startCallbackServer(scheme);
  if (result.status !== "ok") {
    throw new Error(`Failed to start callback server: ${result.error}`);
  }
  const redirectUri = `http://127.0.0.1:${result.data}`;

  const url = new URL(path, env.VITE_APP_URL);
  url.searchParams.set("flow", "desktop");
  url.searchParams.set("scheme", scheme);
  url.searchParams.set("redirect_uri", redirectUri);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
};

// https://www.rfc-editor.org/rfc/rfc4122#section-4.1.7
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const DEVICE_FINGERPRINT_HEADER = "x-device-fingerprint";
export const CHAR_TASK_HEADER = "x-char-task";
