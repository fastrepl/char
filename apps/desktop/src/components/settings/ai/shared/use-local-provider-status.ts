import { useQuery } from "@tanstack/react-query";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import * as settings from "../../../../store/tinybase/store/settings";

export type LocalProviderStatus = "connected" | "disconnected" | "checking";

const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

const DEFAULT_URLS: Record<string, string> = {
  ollama: "http://127.0.0.1:11434/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
};

async function checkConnection(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await tauriFetch(`${baseUrl}/models`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function useLocalProviderStatus(providerId: string): {
  status: LocalProviderStatus | null;
  refetch: () => void;
} {
  const isLocal = LOCAL_PROVIDERS.has(providerId);

  const configuredProviders = settings.UI.useResultTable(
    settings.QUERIES.llmProviders,
    settings.STORE_ID,
  );
  const baseUrl = String(
    configuredProviders[providerId]?.base_url || DEFAULT_URLS[providerId] || "",
  ).trim();

  const query = useQuery({
    enabled: isLocal && !!baseUrl,
    queryKey: ["local-provider-status", providerId, baseUrl],
    queryFn: () => checkConnection(baseUrl),
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });

  if (!isLocal) {
    return { status: null, refetch: () => {} };
  }

  const status: LocalProviderStatus =
    query.isLoading || (query.isFetching && !query.data)
      ? "checking"
      : query.data
        ? "connected"
        : "disconnected";

  return { status, refetch: () => void query.refetch() };
}
