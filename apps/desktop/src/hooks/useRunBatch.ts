import { useCallback, useRef } from "react";

import type { BatchParams } from "@hypr/plugin-listener2";

import { useConfigValue } from "../config/use-config";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import { makePersistCallback } from "../store/transcript/utils";
import type { HandlePersistCallback } from "../store/zustand/listener/transcript";
import { type Tab, useTabs } from "../store/zustand/tabs";
import { id } from "../utils";
import { useKeywords } from "./useKeywords";
import { useSTTConnection } from "./useSTTConnection";

type RunOptions = {
  handlePersist?: HandlePersistCallback;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  keywords?: string[];
  languages?: string[];
};

const BATCH_PROVIDER_MAP: Record<string, BatchParams["provider"]> = {
  deepgram: "deepgram",
  soniox: "soniox",
  assemblyai: "assemblyai",
};

function getBatchProvider(
  provider: string,
  model: string,
): BatchParams["provider"] | null {
  if (provider === "hyprnote" && model.startsWith("am-")) {
    return "am";
  }
  return BATCH_PROVIDER_MAP[provider] ?? null;
}

export const useRunBatch = (sessionId: string) => {
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const runBatch = useListener((state) => state.runBatch);
  const sessionTab = useTabs((state) => {
    const found = state.tabs.find(
      (tab): tab is Extract<Tab, { type: "sessions" }> =>
        tab.type === "sessions" && tab.id === sessionId,
    );
    return found ?? null;
  });
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);

  const sessionTabRef = useRef(sessionTab);
  sessionTabRef.current = sessionTab;

  const { conn } = useSTTConnection();
  const keywords = useKeywords(sessionId);
  const languages = useConfigValue("spoken_languages");

  return useCallback(
    async (filePath: string, options?: RunOptions) => {
      if (!store || !conn || !runBatch) {
        throw new Error(
          "STT connection is not available. Please configure your speech-to-text provider.",
        );
      }

      const provider = getBatchProvider(conn.provider, conn.model);

      if (!provider) {
        throw new Error(
          `Batch transcription is not supported for provider: ${conn.provider}`,
        );
      }

      if (sessionTabRef.current) {
        updateSessionTabState(sessionTabRef.current, {
          ...sessionTabRef.current.state,
          view: { type: "transcript" },
        });
      }

      const transcriptId = id();
      const createdAt = new Date().toISOString();

      store.setRow("transcripts", transcriptId, {
        session_id: sessionId,
        user_id: user_id ?? "",
        created_at: createdAt,
        started_at: Date.now(),
        words: "[]",
        speaker_hints: "[]",
      });

      const persist: HandlePersistCallback =
        options?.handlePersist ?? makePersistCallback(store, transcriptId);

      const params: BatchParams = {
        session_id: sessionId,
        provider,
        file_path: filePath,
        model: options?.model ?? conn.model,
        base_url: options?.baseUrl ?? conn.baseUrl,
        api_key: options?.apiKey ?? conn.apiKey,
        keywords: options?.keywords ?? keywords ?? [],
        languages: options?.languages ?? languages ?? [],
      };

      await runBatch(params, { handlePersist: persist, sessionId });
    },
    [
      conn,
      keywords,
      languages,
      runBatch,
      sessionId,
      store,
      updateSessionTabState,
      user_id,
    ],
  );
};
