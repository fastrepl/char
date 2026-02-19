import type { StoreApi } from "zustand";

import type { BatchResponse } from "@hypr/plugin-listener2";
import type { SpeakerHint, TranscriptWord } from "@hypr/plugin-listener2";

import {
  ChannelProfile,
  type RuntimeSpeakerHint,
  type WordLike,
} from "../../../utils/segment";
import { transformWordEntries } from "./utils";

export type BatchPersistCallback = (
  words: WordLike[],
  hints: RuntimeSpeakerHint[],
) => void;

export type BatchPhase = "importing" | "transcribing";

export type BatchState = {
  batch: Record<
    string,
    {
      percentage: number;
      isComplete?: boolean;
      error?: string;
      phase?: BatchPhase;
    }
  >;
  batchPersist: Record<string, BatchPersistCallback>;
};

export type BatchActions = {
  handleBatchStarted: (sessionId: string, phase?: BatchPhase) => void;
  handleBatchResponse: (sessionId: string, response: BatchResponse) => void;
  handleBatchResponseStreamed: (
    sessionId: string,
    words: TranscriptWord[],
    speakerHints: SpeakerHint[],
    percentage: number,
  ) => void;
  handleBatchFailed: (sessionId: string, error: string) => void;
  clearBatchSession: (sessionId: string) => void;
  setBatchPersist: (sessionId: string, callback: BatchPersistCallback) => void;
  clearBatchPersist: (sessionId: string) => void;
};

export const createBatchSlice = <T extends BatchState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BatchState & BatchActions => ({
  batch: {},
  batchPersist: {},

  handleBatchStarted: (sessionId, phase) => {
    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: {
          percentage: 0,
          isComplete: false,
          phase: phase ?? "transcribing",
        },
      },
    }));
  },

  handleBatchResponse: (sessionId, response) => {
    const persist = get().batchPersist[sessionId];

    const [words, hints] = transformBatch(response);
    if (!words.length) {
      return;
    }

    persist?.(words, hints);

    set((state) => {
      if (!state.batch[sessionId]) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batch;
      return {
        ...state,
        batch: rest,
      };
    });
  },

  handleBatchResponseStreamed: (sessionId, words, speakerHints, percentage) => {
    const persist = get().batchPersist[sessionId];

    if (persist && words.length > 0) {
      const wordLikes: WordLike[] = words.map((w) => ({
        text: w.text,
        start_ms: w.start_ms,
        end_ms: w.end_ms,
        channel: w.channel,
      }));

      const hints: RuntimeSpeakerHint[] = speakerHints.map((h) => {
        const wordIndex = words.findIndex((w) => w.id === h.word_id);
        return {
          wordIndex: wordIndex >= 0 ? wordIndex : 0,
          data: {
            type: "provider_speaker_index" as const,
            speaker_index: h.speaker_index,
          },
        };
      });

      persist(wordLikes, hints);
    }

    const isComplete = percentage >= 1;

    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: {
          percentage,
          isComplete: isComplete || false,
          phase: "transcribing",
        },
      },
    }));
  },

  handleBatchFailed: (sessionId, error) => {
    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: {
          ...(state.batch[sessionId] ?? { percentage: 0 }),
          error,
          isComplete: false,
        },
      },
    }));
  },

  clearBatchSession: (sessionId) => {
    set((state) => {
      if (!(sessionId in state.batch)) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batch;
      return {
        ...state,
        batch: rest,
      };
    });
  },

  setBatchPersist: (sessionId, callback) => {
    set((state) => ({
      ...state,
      batchPersist: {
        ...state.batchPersist,
        [sessionId]: callback,
      },
    }));
  },

  clearBatchPersist: (sessionId) => {
    set((state) => {
      if (!(sessionId in state.batchPersist)) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batchPersist;
      return {
        ...state,
        batchPersist: rest,
      };
    });
  },
});

function transformBatch(
  response: BatchResponse,
): [WordLike[], RuntimeSpeakerHint[]] {
  const allWords: WordLike[] = [];
  const allHints: RuntimeSpeakerHint[] = [];
  let wordOffset = 0;

  response.results.channels.forEach((channel) => {
    const alternative = channel.alternatives[0];
    if (!alternative || !alternative.words || !alternative.words.length) {
      return;
    }

    const [words, hints] = transformWordEntries(
      alternative.words,
      alternative.transcript,
      ChannelProfile.MixedCapture,
    );

    hints.forEach((hint) => {
      allHints.push({
        ...hint,
        wordIndex: hint.wordIndex + wordOffset,
      });
    });
    allWords.push(...words);
    wordOffset += words.length;
  });

  return [allWords, allHints];
}
