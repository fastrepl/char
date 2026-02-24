import { useCallback } from "react";

import * as main from "../store/tinybase/store/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import type { Tab } from "../store/zustand/tabs";
import { useAITaskTask } from "./useAITaskTask";
import { useLanguageModel } from "./useLLMConnection";

export function useTitleGeneration(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel("title");

  const titleTaskId = createTaskId(sessionId, "title");

  const updateTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
    [],
    main.STORE_ID,
  );

  const handleTitleSuccess = useCallback(
    ({ text }: { text: string }) => {
      if (text) {
        const trimmedTitle = text.trim();
        if (trimmedTitle && trimmedTitle !== "<EMPTY>") {
          updateTitle(trimmedTitle);
        }
      }
    },
    [updateTitle],
  );

  const titleTask = useAITaskTask(titleTaskId, "title", {
    onSuccess: handleTitleSuccess,
  });

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
