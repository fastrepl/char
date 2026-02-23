import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { PartialWord, TranscriptDelta } from "@hypr/plugin-listener";

type PartialWordsByChannel = Record<number, PartialWord[]>;

export type HandlePersistCallback = (delta: TranscriptDelta) => void;

export type TranscriptState = {
  partialWordsByChannel: PartialWordsByChannel;
  handlePersist?: HandlePersistCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: HandlePersistCallback) => void;
  handleTranscriptDelta: (delta: TranscriptDelta) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  partialWordsByChannel: {},
  handlePersist: undefined,
};

export const createTranscriptSlice = <
  T extends TranscriptState & TranscriptActions,
>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => ({
  ...initialState,
  setTranscriptPersist: (callback) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.handlePersist = callback;
      }),
    );
  },
  handleTranscriptDelta: (delta) => {
    const partialWordsByChannel: PartialWordsByChannel = {};
    for (const word of delta.partials) {
      const ch = word.channel;
      partialWordsByChannel[ch] ??= [];
      partialWordsByChannel[ch].push(word);
    }

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel = partialWordsByChannel;
      }),
    );

    if (delta.new_words.length > 0 || delta.replaced_ids.length > 0) {
      get().handlePersist?.(delta);
    }
  },
  resetTranscript: () => {
    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel = {};
        draft.handlePersist = undefined;
      }),
    );
  },
});
