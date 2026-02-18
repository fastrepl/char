import { useCallback } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import type { TranscriptWord } from "@hypr/plugin-listener";

import { useConfigValue } from "../config/use-config";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import type { SpeakerHintWithId, WordWithId } from "../store/transcript/types";
import {
  parseTranscriptHints,
  parseTranscriptWords,
  updateTranscriptHints,
  updateTranscriptWords,
} from "../store/transcript/utils";
import type { HandlePersistCallback } from "../store/zustand/listener/transcript";
import { id } from "../utils";
import { getSessionEventById } from "../utils/session-event";
import { useKeywords } from "./useKeywords";
import { useSTTConnection } from "./useSTTConnection";

export function useStartListening(sessionId: string) {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const record_enabled = useConfigValue("save_recordings");
  const languages = useConfigValue("spoken_languages");

  const start = useListener((state) => state.start);
  const { conn } = useSTTConnection();

  const keywords = useKeywords(sessionId);

  const startListening = useCallback(() => {
    if (!conn || !store) {
      console.error("no_stt_connection");
      return;
    }

    const transcriptId = id();
    const startedAt = Date.now();

    store.setRow("transcripts", transcriptId, {
      session_id: sessionId,
      user_id: user_id ?? "",
      created_at: new Date().toISOString(),
      started_at: startedAt,
      words: "[]",
      speaker_hints: "[]",
    });

    void analyticsCommands.event({
      event: "session_started",
      has_calendar_event: !!getSessionEventById(store, sessionId),
      stt_provider: conn.provider,
      stt_model: conn.model,
    });

    const handlePersist: HandlePersistCallback = (words: TranscriptWord[]) => {
      if (words.length === 0) {
        return;
      }

      store.transaction(() => {
        const existingWords = parseTranscriptWords(store, transcriptId);
        const existingHints = parseTranscriptHints(store, transcriptId);

        const newWords: WordWithId[] = words.map((w) => ({
          id: w.id,
          text: w.text,
          start_ms: w.start_ms,
          end_ms: w.end_ms,
          channel: w.channel,
        }));

        const newHints: SpeakerHintWithId[] = words
          .filter((w) => w.speaker !== null)
          .map((w) => ({
            id: id(),
            word_id: w.id,
            type: "provider_speaker_index",
            value: JSON.stringify({
              provider: conn.provider,
              channel: w.channel,
              speaker_index: w.speaker,
            }),
          }));

        updateTranscriptWords(store, transcriptId, [
          ...existingWords,
          ...newWords,
        ]);
        updateTranscriptHints(store, transcriptId, [
          ...existingHints,
          ...newHints,
        ]);
      });
    };

    start(
      {
        session_id: sessionId,
        languages,
        onboarding: false,
        record_enabled,
        model: conn.model,
        base_url: conn.baseUrl,
        api_key: conn.apiKey,
        keywords,
      },
      {
        handlePersist,
      },
    );
  }, [
    conn,
    store,
    sessionId,
    start,
    keywords,
    user_id,
    record_enabled,
    languages,
  ]);

  return startListening;
}
