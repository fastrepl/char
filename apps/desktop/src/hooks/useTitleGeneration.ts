import { useCallback } from "react";

import { createTaskId } from "../store/zustand/ai-task/task-configs";
import type { Tab } from "../store/zustand/tabs";
import { useAITaskTask } from "./useAITaskTask";
import { useLanguageModel } from "./useLLMConnection";

export function useTitleGeneration(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel("title");

  const titleTaskId = createTaskId(sessionId, "title");
  const titleTask = useAITaskTask(titleTaskId, "title");

  const generateTitle = useCallback(() => {
    if (!model) {
      return;
    }

    void titleTask.start({
      model,
      args: { sessionId },
    });
  }, [model, titleTask.start, sessionId]);

  return {
    isGenerating: titleTask.isGenerating,
    generateTitle,
  };
}
