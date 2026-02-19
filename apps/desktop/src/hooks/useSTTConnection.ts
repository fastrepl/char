import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";
import type { AIProviderStorage } from "@hypr/store";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { providerRowId } from "../components/settings/ai/shared";
import { ProviderId } from "../components/settings/ai/stt/shared";
import { env } from "../env";
import * as settings from "../store/tinybase/store/settings";

let cactusStarting = false;

export const useSTTConnection = () => {
  const auth = useAuth();
  const billing = useBillingAccess();
  const { current_stt_provider, current_stt_model } = settings.UI.useValues(
    settings.STORE_ID,
  ) as {
    current_stt_provider: ProviderId | undefined;
    current_stt_model: string | undefined;
  };

  const providerConfig = settings.UI.useRow(
    "ai_providers",
    current_stt_provider ? providerRowId("stt", current_stt_provider) : "",
    settings.STORE_ID,
  ) as AIProviderStorage | undefined;

  const isLocalModel =
    current_stt_provider === "hyprnote" &&
    !!current_stt_model &&
    (current_stt_model.startsWith("am-") ||
      current_stt_model.startsWith("Quantized") ||
      current_stt_model === "cactus");

  const isCloudModel =
    current_stt_provider === "hyprnote" && current_stt_model === "cloud";

  const local = useQuery({
    enabled: current_stt_provider === "hyprnote",
    queryKey: ["stt-connection", isLocalModel, current_stt_model],
    refetchInterval: 1000,
    queryFn: async () => {
      if (!isLocalModel || !current_stt_model) {
        return null;
      }

      const isCactus = current_stt_model === "cactus";

      if (!isCactus) {
        const downloaded = await localSttCommands.isModelDownloaded(
          current_stt_model as SupportedSttModel,
        );
        if (downloaded.status !== "ok" || !downloaded.data) {
          return { status: "not_downloaded" as const, connection: null };
        }
      }

      const servers = await localSttCommands.getServers();

      if (servers.status !== "ok") {
        return null;
      }

      const isInternalModel =
        current_stt_model.startsWith("Quantized") || isCactus;
      const server = isInternalModel
        ? servers.data.internal
        : servers.data.external;

      if (isCactus && server?.status !== "ready") {
        if (!cactusStarting) {
          cactusStarting = true;
          localSttCommands
            .startServer("QuantizedSmall" as SupportedSttModel)
            .finally(() => {
              cactusStarting = false;
            });
        }
        return { status: "loading" as const, connection: null };
      }

      if (server?.status === "ready" && server.url) {
        return {
          status: "ready" as const,
          connection: {
            provider: current_stt_provider!,
            model: current_stt_model,
            baseUrl: server.url,
            apiKey: "",
          },
        };
      }

      return {
        status: server?.status,
        connection: null,
      };
    },
  });

  const baseUrl = providerConfig?.base_url?.trim();
  const apiKey = providerConfig?.api_key?.trim();

  const connection = useMemo(() => {
    if (!current_stt_provider || !current_stt_model) {
      return null;
    }

    if (isLocalModel) {
      return local.data?.connection ?? null;
    }

    if (isCloudModel) {
      if (!auth?.session || !billing.isPro) {
        return null;
      }

      return {
        provider: current_stt_provider,
        model: current_stt_model,
        baseUrl: baseUrl ?? new URL("/stt", env.VITE_API_URL).toString(),
        apiKey: auth.session.access_token,
      };
    }

    if (!baseUrl || !apiKey) {
      return null;
    }

    return {
      provider: current_stt_provider,
      model: current_stt_model,
      baseUrl,
      apiKey,
    };
  }, [
    current_stt_provider,
    current_stt_model,
    isLocalModel,
    isCloudModel,
    local.data,
    baseUrl,
    apiKey,
    auth,
    billing.isPro,
  ]);

  return {
    conn: connection,
    local,
    isLocalModel,
    isCloudModel,
  };
};
