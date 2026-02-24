import { useCallback, useEffect, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAITask } from "../../contexts/ai-task";
import { useListener } from "../../contexts/listener";
import * as main from "../../store/tinybase/store/main";
import * as settings from "../../store/tinybase/store/settings";
import { createTaskId } from "../../store/zustand/ai-task/task-configs";
import { getTaskState } from "../../store/zustand/ai-task/tasks";
import { useTabs } from "../../store/zustand/tabs";
import type { Tab } from "../../store/zustand/tabs/schema";
import { useCreateEnhancedNote } from "../useEnhancedNotes";
import { useLanguageModel, useLLMConnection } from "../useLLMConnection";
import { getEligibility } from "./eligibility";

type RunResult =
  | { type: "started"; noteId: string }
  | { type: "skipped"; reason: string }
  | { type: "no_model" };

export function useAutoEnhanceRunner(
  tab: Extract<Tab, { type: "sessions" }>,
  transcriptIds: string[],
  hasTranscript: boolean,
): {
  run: () => RunResult;
  isEnhancing: boolean;
} {
  const sessionId = tab.id;
  const model = useLanguageModel("enhance");
  const { conn: llmConn } = useLLMConnection();
  const { updateSessionTabState } = useTabs();
  const createEnhancedNote = useCreateEnhancedNote();

  const listenerStatus = useListener((state) => state.live.status);
  const liveSessionId = useListener((state) => state.live.sessionId);

  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const selectedTemplateId = settings.UI.useValue(
    "selected_template_id",
    settings.STORE_ID,
  ) as string | undefined;

  const startedTasksRef = useRef<Set<string>>(new Set());
  const currentNoteIdRef = useRef<string | null>(null);
  const hasRunRef = useRef(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    if (listenerStatus === "active" && liveSessionId === sessionId) {
      hasRunRef.current = false;
    }
  }, [listenerStatus, liveSessionId, sessionId]);

  const {
    generate,
    tasks,
    getState: getAITaskState,
  } = useAITask((state) => ({
    generate: state.generate,
    tasks: state.tasks,
    getState: state.getState,
  }));

  const run = useCallback((): RunResult => {
    if (hasRunRef.current) {
      return {
        type: "skipped",
        reason: "Auto-enhance already triggered for this session",
      };
    }

    const eligibility = getEligibility(hasTranscript, transcriptIds, store);

    if (!eligibility.eligible) {
      return { type: "skipped", reason: eligibility.reason };
    }

    if (!model) {
      return { type: "no_model" };
    }

    const enhancedNoteId = createEnhancedNote(
      sessionId,
      selectedTemplateId || undefined,
    );
    if (!enhancedNoteId) {
      return { type: "skipped", reason: "Failed to create note" };
    }

    hasRunRef.current = true;
    currentNoteIdRef.current = enhancedNoteId;

    updateSessionTabState(tabRef.current, {
      ...tabRef.current.state,
      view: { type: "enhanced", id: enhancedNoteId },
    });

    if (!startedTasksRef.current.has(enhancedNoteId)) {
      startedTasksRef.current.add(enhancedNoteId);
      void analyticsCommands.event({
        event: "note_enhanced",
        is_auto: true,
        llm_provider: llmConn?.providerId,
        llm_model: llmConn?.modelId,
      });
    }

    const enhanceTaskId = createTaskId(enhancedNoteId, "enhance");
    const existingTask = getAITaskState(enhanceTaskId);
    if (
      existingTask?.status === "generating" ||
      existingTask?.status === "success"
    ) {
      return { type: "started", noteId: enhancedNoteId };
    }

    const templateId = selectedTemplateId || undefined;
    void generate(enhanceTaskId, {
      model,
      taskType: "enhance",
      args: { sessionId, enhancedNoteId, templateId },
    });

    return { type: "started", noteId: enhancedNoteId };
  }, [
    hasTranscript,
    transcriptIds,
    store,
    model,
    sessionId,
    createEnhancedNote,
    selectedTemplateId,
    updateSessionTabState,
    llmConn,
    generate,
    getAITaskState,
  ]);

  const currentEnhanceTaskId = currentNoteIdRef.current
    ? createTaskId(currentNoteIdRef.current, "enhance")
    : null;
  const currentEnhanceTaskState = currentEnhanceTaskId
    ? getTaskState(tasks, currentEnhanceTaskId)
    : undefined;
  const isEnhancing = currentEnhanceTaskState?.status === "generating";

  return {
    run,
    isEnhancing,
  };
}
