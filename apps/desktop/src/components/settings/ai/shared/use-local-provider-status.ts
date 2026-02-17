import { useQuery } from "@tanstack/react-query";

import * as settings from "../../../../store/tinybase/store/settings";
import { checkLocalProvider } from "./check-local-provider";

const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

const DEFAULT_URLS: Record<string, string> = {
  ollama: "http://127.0.0.1:11434/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
};

export function useLocalProviderStatus(
  providerId: string,
): "connected" | "disconnected" | "checking" | null {
  const isLocal = LOCAL_PROVIDERS.has(providerId);

  const configuredProviders = settings.UI.useResultTable(
    settings.QUERIES.llmProviders,
    settings.STORE_ID,
  );

  const config = configuredProviders[`llm:${providerId}`];
  const baseUrl = String(
    config?.base_url || DEFAULT_URLS[providerId] || "",
  ).trim();

  const query = useQuery({
    enabled: isLocal,
    queryKey: ["local-provider-status", providerId, baseUrl],
    queryFn: () => checkLocalProvider(providerId, baseUrl),
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });

  if (!isLocal) return null;

  return query.isLoading
    ? "checking"
    : query.data
      ? "connected"
      : "disconnected";
}
