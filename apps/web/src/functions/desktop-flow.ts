import { z } from "zod";

import type { DeepLink } from "@hypr/plugin-deeplink2";

export const DESKTOP_SCHEMES = [
  "hypr",
  "hyprnote",
  "hyprnote-nightly",
  "hyprnote-staging",
  "char",
  "char-nightly",
  "char-staging",
] as const;

export const desktopSchemeSchema = z.enum(DESKTOP_SCHEMES);

export const normalizeDesktopRedirectUri = (
  value: string | undefined,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:") {
      return undefined;
    }
    if (!url.port || url.username || url.password || url.search || url.hash) {
      return undefined;
    }
    if (url.pathname !== "/" && url.pathname !== "") {
      return undefined;
    }

    const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "::1"
    ) {
      return undefined;
    }

    const port = Number.parseInt(url.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return undefined;
    }

    return `http://127.0.0.1:${url.port}`;
  } catch {
    return undefined;
  }
};

export const desktopRedirectUriSchema = z
  .string()
  .optional()
  .transform((v) => normalizeDesktopRedirectUri(v));

export type DesktopFlow = "desktop" | "web";

type DesktopReturnContextInput = {
  flow?: DesktopFlow;
  scheme?: string;
  redirect_uri?: string;
};

export type DesktopReturnContext = {
  flow: DesktopFlow;
  scheme?: string;
  redirectUri?: string;
  isDesktop: boolean;
};

export const getDesktopReturnContext = (
  input: DesktopReturnContextInput,
): DesktopReturnContext => {
  const flow = input.flow ?? "web";
  return {
    flow,
    scheme: input.scheme,
    redirectUri: normalizeDesktopRedirectUri(input.redirect_uri),
    isDesktop: flow === "desktop",
  };
};

type DesktopCallbackPath = DeepLink["to"];

const DESKTOP_CALLBACK_PATHS = {
  auth: "/auth/callback",
  billing: "/billing/refresh",
  integration: "/integration/callback",
} as const satisfies Record<
  "auth" | "billing" | "integration",
  DesktopCallbackPath
>;

const buildSchemeCallbackUrl = (
  scheme: string,
  path: DesktopCallbackPath,
  params?: URLSearchParams,
): string => {
  const normalizedPath = path.replace(/^\//, "");
  const search = params?.toString();
  return search
    ? `${scheme}://${normalizedPath}?${search}`
    : `${scheme}://${normalizedPath}`;
};

const buildLocalCallbackUrl = (
  redirectUri: string,
  path: DesktopCallbackPath,
  params?: URLSearchParams,
): string => {
  const url = new URL(path, `${redirectUri}/`);
  if (params) {
    url.search = params.toString();
  }
  return url.toString();
};

export type DesktopCallbackUrls = {
  primary?: string;
  fallback?: string;
  local?: string;
  scheme?: string;
};

type DesktopAuthCallbackOptions = {
  type: "auth";
  access_token: string;
  refresh_token: string;
};

type DesktopBillingCallbackOptions = {
  type: "billing";
};

type DesktopIntegrationCallbackOptions = {
  type: "integration";
  integration_id: string;
  status: string;
  return_to?: string;
};

type DesktopCallbackOptions =
  | DesktopAuthCallbackOptions
  | DesktopBillingCallbackOptions
  | DesktopIntegrationCallbackOptions;

export const buildDesktopCallbackUrls = (
  context: DesktopReturnContext,
  options: DesktopCallbackOptions,
): DesktopCallbackUrls => {
  if (!context.isDesktop) {
    return {};
  }

  const params = new URLSearchParams();
  let path: DesktopCallbackPath;

  if (options.type === "auth") {
    path = DESKTOP_CALLBACK_PATHS.auth;
    params.set("access_token", options.access_token);
    params.set("refresh_token", options.refresh_token);
  } else if (options.type === "billing") {
    path = DESKTOP_CALLBACK_PATHS.billing;
  } else {
    path = DESKTOP_CALLBACK_PATHS.integration;
    params.set("integration_id", options.integration_id);
    params.set("status", options.status);
    if (options.return_to) {
      params.set("return_to", options.return_to);
    }
  }

  const scheme = context.scheme
    ? buildSchemeCallbackUrl(context.scheme, path, params)
    : undefined;
  const local = context.redirectUri
    ? buildLocalCallbackUrl(context.redirectUri, path, params)
    : undefined;
  const primary = local ?? scheme;
  const fallback = local && scheme ? scheme : undefined;

  return { primary, fallback, local, scheme };
};

export const buildLocalAuthCallbackUrl = (
  redirectUri: string,
  tokens: { access_token: string; refresh_token: string },
): string => {
  return buildLocalCallbackUrl(
    redirectUri,
    DESKTOP_CALLBACK_PATHS.auth,
    new URLSearchParams(tokens),
  );
};

export const buildLocalBillingRefreshUrl = (redirectUri: string): string => {
  return buildLocalCallbackUrl(redirectUri, DESKTOP_CALLBACK_PATHS.billing);
};

export const buildLocalIntegrationCallbackUrl = (
  redirectUri: string,
  params: { integration_id: string; status: string; return_to?: string },
): string => {
  const searchParams = new URLSearchParams({
    integration_id: params.integration_id,
    status: params.status,
  });
  if (params.return_to) {
    searchParams.set("return_to", params.return_to);
  }
  return buildLocalCallbackUrl(
    redirectUri,
    DESKTOP_CALLBACK_PATHS.integration,
    searchParams,
  );
};
