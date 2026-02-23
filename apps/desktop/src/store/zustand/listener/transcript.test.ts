import { beforeEach, describe, expect, test, vi } from "vitest";
import { createStore } from "zustand";

import type { TranscriptDelta } from "@hypr/plugin-listener";

import {
  createTranscriptSlice,
  type TranscriptActions,
  type TranscriptState,
} from "./transcript";

const createTranscriptStore = () => {
  return createStore<TranscriptState & TranscriptActions>((set, get) =>
    createTranscriptSlice(set, get),
  );
};

const makeDelta = (partial: Partial<TranscriptDelta>): TranscriptDelta => ({
  new_words: [],
  hints: [],
  replaced_ids: [],
  partials: [],
  ...partial,
});

describe("transcript slice", () => {
  type TranscriptStore = ReturnType<typeof createTranscriptStore>;
  let store: TranscriptStore;

  beforeEach(() => {
    store = createTranscriptStore();
  });

  test("stores partials grouped by channel", () => {
    store.getState().handleTranscriptDelta(
      makeDelta({
        partials: [
          { text: " Hello", start_ms: 0, end_ms: 500, channel: 0 },
          { text: " world", start_ms: 500, end_ms: 1000, channel: 0 },
          { text: " hi", start_ms: 0, end_ms: 300, channel: 1 },
        ],
      }),
    );

    const state = store.getState();
    expect(state.partialWordsByChannel[0]).toHaveLength(2);
    expect(state.partialWordsByChannel[1]).toHaveLength(1);
  });

  test("replaces partials snapshot on each delta", () => {
    store.getState().handleTranscriptDelta(
      makeDelta({
        partials: [{ text: " Hello", start_ms: 0, end_ms: 500, channel: 0 }],
      }),
    );
    store.getState().handleTranscriptDelta(
      makeDelta({
        partials: [
          { text: " Hello", start_ms: 0, end_ms: 500, channel: 0 },
          { text: " world", start_ms: 500, end_ms: 1000, channel: 0 },
        ],
      }),
    );

    expect(store.getState().partialWordsByChannel[0]).toHaveLength(2);
  });

  test("calls persist when new_words are present", () => {
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    store.getState().handleTranscriptDelta(
      makeDelta({
        new_words: [
          {
            id: "1",
            text: " Hello",
            start_ms: 0,
            end_ms: 500,
            channel: 0,
            state: "final",
          },
        ],
      }),
    );

    expect(persist).toHaveBeenCalledTimes(1);
    const delta = persist.mock.calls[0][0] as TranscriptDelta;
    expect(delta.new_words).toHaveLength(1);
    expect(delta.new_words[0]?.text).toBe(" Hello");
  });

  test("calls persist when replaced_ids are present", () => {
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    store
      .getState()
      .handleTranscriptDelta(makeDelta({ replaced_ids: ["old-id-1"] }));

    expect(persist).toHaveBeenCalledTimes(1);
  });

  test("does not call persist for partial-only deltas", () => {
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    store.getState().handleTranscriptDelta(
      makeDelta({
        partials: [{ text: " Hello", start_ms: 0, end_ms: 500, channel: 0 }],
      }),
    );

    expect(persist).not.toHaveBeenCalled();
  });

  test("clears state on resetTranscript", () => {
    store.getState().setTranscriptPersist(vi.fn());
    store.getState().handleTranscriptDelta(
      makeDelta({
        partials: [{ text: " Hello", start_ms: 0, end_ms: 500, channel: 0 }],
      }),
    );

    store.getState().resetTranscript();

    const state = store.getState();
    expect(state.partialWordsByChannel).toEqual({});
    expect(state.handlePersist).toBeUndefined();
  });
});
