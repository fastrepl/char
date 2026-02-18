import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { TranscriptWord } from "@hypr/plugin-listener";

import type { WordLike } from "../../../utils/segment";

export type HandlePersistCallback = (words: TranscriptWord[]) => void;

export type TranscriptState = {
  partialWords: WordLike[];
  handlePersist?: HandlePersistCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: HandlePersistCallback) => void;
  handleTranscriptUpdate: (
    newFinalWords: TranscriptWord[],
    partialWords: TranscriptWord[],
  ) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  partialWords: [],
  handlePersist: undefined,
};

function transcriptWordToWordLike(w: TranscriptWord): WordLike {
  return {
    text: w.text,
    start_ms: w.start_ms,
    end_ms: w.end_ms,
    channel: w.channel,
  };
}

export const createTranscriptSlice = <
  T extends TranscriptState & TranscriptActions,
>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => {
  return {
    ...initialState,
    setTranscriptPersist: (callback) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.handlePersist = callback;
        }),
      );
    },
    handleTranscriptUpdate: (newFinalWords, partialWords) => {
      const { handlePersist } = get();

      if (newFinalWords.length > 0) {
        handlePersist?.(newFinalWords);
      }

      set((state) =>
        mutate(state, (draft) => {
          draft.partialWords = partialWords.map(transcriptWordToWordLike);
        }),
      );
    },
    resetTranscript: () => {
      set((state) =>
        mutate(state, (draft) => {
          draft.partialWords = [];
          draft.handlePersist = undefined;
        }),
      );
    },
  };
};
