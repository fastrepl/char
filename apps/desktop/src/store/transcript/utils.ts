import type { TranscriptDelta } from "@hypr/plugin-listener";

import { id } from "../../utils";
import type { HandlePersistCallback } from "../zustand/listener/transcript";
import type { SpeakerHintWithId, WordWithId } from "./types";

interface TranscriptStore {
  getCell(
    tableId: "transcripts",
    rowId: string,
    cellId: "words" | "speaker_hints",
  ): unknown;
  setCell(
    tableId: "transcripts",
    rowId: string,
    cellId: "words" | "speaker_hints",
    value: string,
  ): void;
  transaction<T>(fn: () => T): T;
}

export function parseTranscriptWords(
  store: TranscriptStore,
  transcriptId: string,
): WordWithId[] {
  const wordsJson = store.getCell("transcripts", transcriptId, "words");
  if (typeof wordsJson !== "string" || !wordsJson) {
    return [];
  }

  try {
    return JSON.parse(wordsJson) as WordWithId[];
  } catch {
    return [];
  }
}

export function parseTranscriptHints(
  store: TranscriptStore,
  transcriptId: string,
): SpeakerHintWithId[] {
  const hintsJson = store.getCell("transcripts", transcriptId, "speaker_hints");
  if (typeof hintsJson !== "string" || !hintsJson) {
    return [];
  }

  try {
    return JSON.parse(hintsJson) as SpeakerHintWithId[];
  } catch {
    return [];
  }
}

export function updateTranscriptWords(
  store: TranscriptStore,
  transcriptId: string,
  words: WordWithId[],
): void {
  store.setCell("transcripts", transcriptId, "words", JSON.stringify(words));
}

export function updateTranscriptHints(
  store: TranscriptStore,
  transcriptId: string,
  hints: SpeakerHintWithId[],
): void {
  store.setCell(
    "transcripts",
    transcriptId,
    "speaker_hints",
    JSON.stringify(hints),
  );
}

export function replaceTranscriptWords(
  store: TranscriptStore,
  transcriptId: string,
  replacedIds: Set<string>,
  newWords: WordWithId[],
): void {
  const existing = parseTranscriptWords(store, transcriptId).filter(
    (w) => !replacedIds.has(w.id),
  );
  const existingHints = parseTranscriptHints(store, transcriptId).filter(
    (h) => h.word_id == null || !replacedIds.has(h.word_id),
  );
  updateTranscriptWords(store, transcriptId, [...existing, ...newWords]);
  updateTranscriptHints(store, transcriptId, existingHints);
}

export function makePersistCallback(
  store: TranscriptStore,
  transcriptId: string,
): HandlePersistCallback {
  return (delta: TranscriptDelta) => {
    if (delta.new_words.length === 0 && delta.replaced_ids.length === 0) {
      return;
    }

    store.transaction(() => {
      const newWords: WordWithId[] = delta.new_words.map((w) => ({
        id: w.id,
        text: w.text,
        start_ms: w.start_ms,
        end_ms: w.end_ms,
        channel: w.channel,
        state: w.state,
      }));

      const newHints: SpeakerHintWithId[] = delta.hints.map((h) => ({
        id: id(),
        word_id: h.word_id,
        type: "provider_speaker_index" as const,
        value: JSON.stringify({ speaker_index: h.speaker_index }),
      }));

      if (delta.replaced_ids.length > 0) {
        replaceTranscriptWords(
          store,
          transcriptId,
          new Set(delta.replaced_ids),
          newWords,
        );
      } else {
        const existing = parseTranscriptWords(store, transcriptId);
        updateTranscriptWords(store, transcriptId, [...existing, ...newWords]);
      }

      if (newHints.length > 0) {
        const existingHints = parseTranscriptHints(store, transcriptId);
        updateTranscriptHints(store, transcriptId, [
          ...existingHints,
          ...newHints,
        ]);
      }
    });
  };
}
