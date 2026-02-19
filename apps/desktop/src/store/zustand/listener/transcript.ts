import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type {
  PartialWord,
  SpeakerHint,
  TranscriptWord,
} from "@hypr/plugin-listener";

export type HandlePersistCallback = (
  words: TranscriptWord[],
  speakerHints: SpeakerHint[],
) => void;

export type TranscriptState = {
  partialWords: PartialWord[];
  handlePersist?: HandlePersistCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: HandlePersistCallback) => void;
  handleTranscriptUpdate: (
    newFinalWords: TranscriptWord[],
    speakerHints: SpeakerHint[],
    partialWords: PartialWord[],
  ) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  partialWords: [],
  handlePersist: undefined,
};

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
    handleTranscriptUpdate: (newFinalWords, speakerHints, partialWords) => {
      const { handlePersist } = get();

      if (newFinalWords.length > 0) {
        handlePersist?.(newFinalWords, speakerHints);
      }

      set((state) =>
        mutate(state, (draft) => {
          draft.partialWords = partialWords;
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
