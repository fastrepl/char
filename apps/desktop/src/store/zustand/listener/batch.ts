import type { StoreApi } from "zustand";

import type { BatchEvent } from "@hypr/plugin-listener2";

import type { HandlePersistCallback } from "./transcript";

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
  batchPersist: Record<string, HandlePersistCallback>;
};

export type BatchActions = {
  handleBatchStarted: (sessionId: string, phase?: BatchPhase) => void;
  handleBatchEvent: (sessionId: string, event: BatchEvent) => void;
  handleBatchFailed: (sessionId: string, error: string) => void;
  clearBatchSession: (sessionId: string) => void;
  setBatchPersist: (sessionId: string, callback: HandlePersistCallback) => void;
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

  handleBatchEvent: (sessionId, event) => {
    const persist = get().batchPersist[sessionId];

    if (event.type === "batchProgress") {
      const { delta, percentage } = event;
      const isComplete = percentage >= 1;

      if (delta.new_words.length > 0 || delta.replaced_ids.length > 0) {
        persist?.(delta);
      }

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
    }
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
      return { ...state, batch: rest };
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
      return { ...state, batchPersist: rest };
    });
  },
});
