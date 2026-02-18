import { describe, expect, test, vi } from "vitest";
import { createStore } from "zustand";

import type { TranscriptWord } from "@hypr/plugin-listener";

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

function makeWord(
  text: string,
  start_ms: number,
  end_ms: number,
  channel = 0,
): TranscriptWord {
  return {
    id: crypto.randomUUID(),
    text,
    start_ms,
    end_ms,
    channel,
    speaker: null,
  };
}

describe("transcript slice", () => {
  test("handles partial words update", () => {
    const store = createTranscriptStore();

    store
      .getState()
      .handleTranscriptUpdate(
        [],
        [makeWord(" Hello", 100, 500), makeWord(" world", 550, 900)],
      );

    const state = store.getState();
    expect(state.partialWords).toHaveLength(2);
    expect(state.partialWords.map((w) => w.text)).toEqual([" Hello", " world"]);
  });

  test("persists final words via callback", () => {
    const store = createTranscriptStore();
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    const finals = [makeWord(" Hello", 100, 500), makeWord(" world", 550, 900)];

    store.getState().handleTranscriptUpdate(finals, []);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(finals);
  });

  test("does not call persist for empty finals", () => {
    const store = createTranscriptStore();
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    store
      .getState()
      .handleTranscriptUpdate([], [makeWord(" partial", 100, 500)]);

    expect(persist).not.toHaveBeenCalled();
  });

  test("atomic final + partial update", () => {
    const store = createTranscriptStore();
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    store
      .getState()
      .handleTranscriptUpdate(
        [makeWord(" Hello", 100, 500)],
        [makeWord(" world", 550, 900), makeWord(" how", 950, 1200)],
      );

    expect(persist).toHaveBeenCalledTimes(1);
    const state = store.getState();
    expect(state.partialWords).toHaveLength(2);
    expect(state.partialWords.map((w) => w.text)).toEqual([" world", " how"]);
  });

  test("reset clears partials and callback", () => {
    const store = createTranscriptStore();
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    store.getState().handleTranscriptUpdate([], [makeWord(" hello", 100, 500)]);

    store.getState().resetTranscript();

    const state = store.getState();
    expect(state.partialWords).toHaveLength(0);
    expect(state.handlePersist).toBeUndefined();
  });
});
