import type { LanguageModel } from "ai";
import { describe, expect, it, vi } from "vitest";

import { EnhancerService } from "./enhancer";

vi.mock("@hypr/plugin-analytics", () => ({
  commands: {
    event: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../store/zustand/listener/instance", () => ({
  listenerStore: {
    getState: vi.fn().mockReturnValue({
      live: { status: "inactive", sessionId: null },
    }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock("../store/zustand/tabs", () => ({
  useTabs: {
    getState: vi.fn().mockReturnValue({
      tabs: [],
      updateSessionTabState: vi.fn(),
    }),
  },
}));

type Tables = Record<string, Record<string, Record<string, any>>>;

function createTables(data?: {
  transcripts?: Record<string, { session_id: string; words: string }>;
  enhanced_notes?: Record<string, { session_id: string; template_id?: string }>;
  sessions?: Record<string, { title: string }>;
}): Tables {
  return {
    transcripts: data?.transcripts ?? {},
    enhanced_notes: data?.enhanced_notes ?? {},
    sessions: data?.sessions ?? {},
    templates: {},
  };
}

function createMockStore(tables: Tables) {
  return {
    getCell: vi.fn((table: string, rowId: string, cellId: string) => {
      return tables[table]?.[rowId]?.[cellId];
    }),
    getValue: vi.fn((valueId: string) => {
      if (valueId === "user_id") return "user-1";
      return undefined;
    }),
    setRow: vi.fn((table: string, rowId: string, row: Record<string, any>) => {
      if (!tables[table]) tables[table] = {};
      tables[table][rowId] = row;
    }),
    setPartialRow: vi.fn(),
  } as any;
}

function createMockIndexes(tables: Tables) {
  return {
    getSliceRowIds: vi.fn((indexId: string, sliceId: string) => {
      if (indexId === "transcriptBySession") {
        return Object.keys(tables.transcripts ?? {}).filter(
          (id) => tables.transcripts[id]?.session_id === sliceId,
        );
      }
      if (indexId === "enhancedNotesBySession") {
        return Object.keys(tables.enhanced_notes ?? {}).filter(
          (id) => tables.enhanced_notes[id]?.session_id === sliceId,
        );
      }
      return [];
    }),
  };
}

function createMockAITaskStore() {
  const generatingTasks = new Set<string>();
  return {
    getState: vi.fn().mockReturnValue({
      generate: vi.fn().mockImplementation((taskId: string) => {
        generatingTasks.add(taskId);
        return Promise.resolve();
      }),
      getState: vi.fn().mockImplementation((taskId: string) => {
        if (generatingTasks.has(taskId)) {
          return { status: "generating" };
        }
        return undefined;
      }),
    }),
  };
}

function createDeps(
  overrides?: Partial<ConstructorParameters<typeof EnhancerService>[0]>,
) {
  const tables = createTables();
  return {
    mainStore: createMockStore(tables),
    indexes: createMockIndexes(tables),
    aiTaskStore: createMockAITaskStore(),
    getModel: () => ({}) as LanguageModel,
    getLLMConn: () => ({ providerId: "test", modelId: "test-model" }),
    getSelectedTemplateId: () => undefined,
    ...overrides,
  };
}

describe("EnhancerService", () => {
  describe("enhance()", () => {
    it("returns no_model when model is null", () => {
      const deps = createDeps({ getModel: () => null });
      const service = new EnhancerService(deps);

      const result = service.enhance("session-1");
      expect(result).toEqual({ type: "no_model" });
    });

    it("returns skipped when no transcript exists", () => {
      const deps = createDeps();
      const service = new EnhancerService(deps);

      const result = service.enhance("session-1");
      expect(result).toEqual({
        type: "skipped",
        reason: "No transcript recorded",
      });
    });

    it("returns skipped when not enough words", () => {
      const tables = createTables({
        transcripts: {
          "t-1": {
            session_id: "session-1",
            words: JSON.stringify([{ text: "hi" }, { text: "there" }]),
          },
        },
      });
      const deps = createDeps({
        mainStore: createMockStore(tables),
        indexes: createMockIndexes(tables),
      });
      const service = new EnhancerService(deps);

      const result = service.enhance("session-1");
      expect(result.type).toBe("skipped");
    });

    it("creates note and starts generation when eligible", () => {
      const words = Array.from({ length: 10 }, (_, i) => ({
        text: `word${i}`,
      }));
      const tables = createTables({
        transcripts: {
          "t-1": {
            session_id: "session-1",
            words: JSON.stringify(words),
          },
        },
      });
      const store = createMockStore(tables);
      const aiTaskStore = createMockAITaskStore();
      const deps = createDeps({
        mainStore: store,
        indexes: createMockIndexes(tables),
        aiTaskStore,
      });
      const service = new EnhancerService(deps);

      const result = service.enhance("session-1");
      expect(result.type).toBe("started");
      expect(store.setRow).toHaveBeenCalledWith(
        "enhanced_notes",
        expect.any(String),
        expect.objectContaining({
          session_id: "session-1",
          title: "Summary",
        }),
      );
      expect(aiTaskStore.getState().generate).toHaveBeenCalled();
    });

    it("reuses existing note with same template", () => {
      const words = Array.from({ length: 10 }, (_, i) => ({
        text: `word${i}`,
      }));
      const tables = createTables({
        transcripts: {
          "t-1": {
            session_id: "session-1",
            words: JSON.stringify(words),
          },
        },
        enhanced_notes: {
          "existing-note": {
            session_id: "session-1",
            template_id: undefined as any,
          },
        },
      });
      const store = createMockStore(tables);
      const deps = createDeps({
        mainStore: store,
        indexes: createMockIndexes(tables),
      });
      const service = new EnhancerService(deps);

      const result = service.enhance("session-1");
      expect(result).toEqual({
        type: "started",
        noteId: "existing-note",
      });
      expect(store.setRow).not.toHaveBeenCalledWith(
        "enhanced_notes",
        expect.not.stringMatching("existing-note"),
        expect.anything(),
      );
    });

    it("does not start generation if task already running", () => {
      const words = Array.from({ length: 10 }, (_, i) => ({
        text: `word${i}`,
      }));
      const tables = createTables({
        transcripts: {
          "t-1": {
            session_id: "session-1",
            words: JSON.stringify(words),
          },
        },
        enhanced_notes: {
          "note-1": {
            session_id: "session-1",
            template_id: undefined as any,
          },
        },
      });
      const aiTaskStore = createMockAITaskStore();
      aiTaskStore.getState.mockReturnValue({
        generate: vi.fn(),
        getState: vi.fn().mockReturnValue({ status: "generating" }),
      });
      const deps = createDeps({
        mainStore: createMockStore(tables),
        indexes: createMockIndexes(tables),
        aiTaskStore,
      });
      const service = new EnhancerService(deps);

      const result = service.enhance("session-1");
      expect(result).toEqual({ type: "started", noteId: "note-1" });
      expect(aiTaskStore.getState().generate).not.toHaveBeenCalled();
    });
  });

  describe("deduplication", () => {
    it("auto-enhance does not run twice for same session", () => {
      const words = Array.from({ length: 10 }, (_, i) => ({
        text: `word${i}`,
      }));
      const tables = createTables({
        transcripts: {
          "t-1": {
            session_id: "session-1",
            words: JSON.stringify(words),
          },
        },
      });
      const aiTaskStore = createMockAITaskStore();
      const deps = createDeps({
        mainStore: createMockStore(tables),
        indexes: createMockIndexes(tables),
        aiTaskStore,
      });
      const service = new EnhancerService(deps);

      const result1 = service.enhance("session-1", { isAuto: true });
      expect(result1.type).toBe("started");

      const result2 = service.enhance("session-1", { isAuto: true });
      expect(result2.type).toBe("started");

      expect(aiTaskStore.getState().generate).toHaveBeenCalledTimes(1);
    });

    it("allows manual enhance even after auto-enhance", () => {
      const words = Array.from({ length: 10 }, (_, i) => ({
        text: `word${i}`,
      }));
      const tables = createTables({
        transcripts: {
          "t-1": {
            session_id: "session-1",
            words: JSON.stringify(words),
          },
        },
      });
      const aiTaskStore = createMockAITaskStore();
      const deps = createDeps({
        mainStore: createMockStore(tables),
        indexes: createMockIndexes(tables),
        aiTaskStore,
      });
      const service = new EnhancerService(deps);

      service.enhance("session-1", { isAuto: true });
      service.enhance("session-1", { templateId: "custom-template" });

      expect(aiTaskStore.getState().generate).toHaveBeenCalledTimes(2);
    });
  });

  describe("event emission", () => {
    it("emits auto-enhance-skipped when enhancement fails", () => {
      const deps = createDeps();
      const service = new EnhancerService(deps);
      const events: any[] = [];
      service.on((event) => events.push(event));

      (service as any).tryAutoEnhance("session-1", 20);

      expect(events).toContainEqual({
        type: "auto-enhance-skipped",
        sessionId: "session-1",
        reason: expect.any(String),
      });
    });
  });

  describe("dispose()", () => {
    it("cleans up subscriptions and timers", () => {
      const deps = createDeps();
      const service = new EnhancerService(deps);
      service.start();
      service.dispose();
    });
  });
});
