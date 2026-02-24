import { useCallback, useEffect, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAITask } from "../contexts/ai-task";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import * as settings from "../store/tinybase/store/settings";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { getEligibility } from "./autoEnhance/eligibility";
import { getStoppedSessionToAutoEnhance } from "./autoEnhance/global-trigger";
import { useCreateEnhancedNote } from "./useEnhancedNotes";
import { useLanguageModel, useLLMConnection } from "./useLLMConnection";

export function useGlobalAutoEnhance() {
  const model = useLanguageModel("enhance");
  const { conn: llmConn } = useLLMConnection();
  const createEnhancedNote = useCreateEnhancedNote();
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);

  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const selectedTemplateId = settings.UI.useValue(
    "selected_template_id",
    settings.STORE_ID,
  ) as string | undefined;

  const { generate, getState: getAITaskState } = useAITask((state) => ({
    generate: state.generate,
    getState: state.getState,
  }));

  const listenerStatus = useListener((state) => state.live.status);
  const liveSessionId = useListener((state) => state.live.sessionId);

  const handledStopRef = useRef<Set<string>>(new Set());
  const startedTasksRef = useRef<Set<string>>(new Set());
  const prevRef = useRef({
    status: listenerStatus,
    sessionId: liveSessionId,
  });

  const runForSession = useCallback(
    (sessionId: string) => {
      if (!store || !indexes || !model) {
        return;
      }

      const transcriptIds = indexes.getSliceRowIds(
        main.INDEXES.transcriptBySession,
        sessionId,
      );
      const hasTranscript = transcriptIds.length > 0;
      const eligibility = getEligibility(hasTranscript, transcriptIds, store);
      if (!eligibility.eligible) {
        return;
      }

      const templateId = selectedTemplateId || undefined;
      const enhancedNoteId = createEnhancedNote(sessionId, templateId);
      if (!enhancedNoteId) {
        return;
      }

      const tabsState = useTabs.getState();
      const sessionTab = tabsState.tabs.find(
        (tab): tab is Extract<Tab, { type: "sessions" }> =>
          tab.type === "sessions" && tab.id === sessionId,
      );

      if (sessionTab) {
        updateSessionTabState(sessionTab, {
          ...sessionTab.state,
          view: { type: "enhanced", id: enhancedNoteId },
        });
      }

      const enhanceTaskId = createTaskId(enhancedNoteId, "enhance");
      const existingTask = getAITaskState(enhanceTaskId);
      if (
        existingTask?.status === "generating" ||
        existingTask?.status === "success"
      ) {
        return;
      }

      if (!startedTasksRef.current.has(enhancedNoteId)) {
        startedTasksRef.current.add(enhancedNoteId);
        void analyticsCommands.event({
          event: "note_enhanced",
          is_auto: true,
          llm_provider: llmConn?.providerId,
          llm_model: llmConn?.modelId,
        });
      }

      void generate(enhanceTaskId, {
        model,
        taskType: "enhance",
        args: { sessionId, enhancedNoteId, templateId },
      });
    },
    [
      store,
      indexes,
      model,
      selectedTemplateId,
      createEnhancedNote,
      updateSessionTabState,
      getAITaskState,
      llmConn,
      generate,
    ],
  );

  useEffect(() => {
    if (listenerStatus === "active" && liveSessionId) {
      handledStopRef.current.delete(liveSessionId);
    }
  }, [listenerStatus, liveSessionId]);

  useEffect(() => {
    const prevStatus = prevRef.current.status;
    const prevSessionId = prevRef.current.sessionId;

    const stoppedSessionId = getStoppedSessionToAutoEnhance({
      previousStatus: prevStatus,
      currentStatus: listenerStatus,
      previousSessionId: prevSessionId,
      currentTab: useTabs.getState().currentTab,
      handledStops: handledStopRef.current,
    });
    if (stoppedSessionId) {
      handledStopRef.current.add(stoppedSessionId);
      runForSession(stoppedSessionId);
    }

    prevRef.current = {
      status: listenerStatus,
      sessionId: liveSessionId,
    };
  }, [listenerStatus, liveSessionId, runForSession]);
}
