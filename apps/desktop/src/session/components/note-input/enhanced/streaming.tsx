import { Streamdown } from "streamdown";
import { useAITaskTask } from "~/ai/hooks";
import { createTaskId } from "~/store/zustand/ai-task/task-configs";
import { type TaskStepInfo } from "~/store/zustand/ai-task/tasks";

import { streamdownComponents } from "@hypr/tiptap/shared";
import { cn } from "@hypr/utils";

export function StreamingView({ enhancedNoteId }: { enhancedNoteId: string }) {
  const taskId = createTaskId(enhancedNoteId, "enhance");
  const { streamedText, currentStep, isGenerating } = useAITaskTask(
    taskId,
    "enhance",
  );

  const step = currentStep as TaskStepInfo<"enhance"> | undefined;
  const hasContent = streamedText.length > 0;

  let statusText: string | null = null;
  if (isGenerating && !hasContent) {
    if (step?.type === "analyzing") {
      statusText = "Analyzing structure...";
    } else if (step?.type === "generating") {
      statusText = "Generating...";
    } else if (step?.type === "retrying") {
      statusText = `Retrying (attempt ${step.attempt})...`;
    } else {
      statusText = "Loading...";
    }
  }

  return (
    <div className="pb-2">
      {statusText ? (
        <p className="text-sm text-neutral-500">{statusText}</p>
      ) : (
        <Streamdown
          components={streamdownComponents}
          className={cn(["flex flex-col"])}
          caret="block"
          isAnimating={isGenerating}
        >
          {streamedText}
        </Streamdown>
      )}
    </div>
  );
}
