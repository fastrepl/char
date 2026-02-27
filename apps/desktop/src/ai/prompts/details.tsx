import { useCallback, useEffect, useState } from "react";
import * as main from "~/store/tinybase/store/main";
import {
  AVAILABLE_FILTERS,
  deleteCustomPrompt,
  setCustomPrompt,
  TASK_CONFIGS,
  type TaskType,
} from "~/store/tinybase/store/prompts";

import { commands as templateCommands } from "@hypr/plugin-template";
import { PromptEditor } from "@hypr/tiptap/prompt";
import { Button } from "@hypr/ui/components/ui/button";

export function PromptDetailsColumn({
  selectedTask,
}: {
  selectedTask: TaskType | null;
}) {
  if (!selectedTask) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-neutral-500">
          Select a task type to view or customize its prompt
        </p>
      </div>
    );
  }

  return <PromptDetails key={selectedTask} selectedTask={selectedTask} />;
}

function PromptDetails({ selectedTask }: { selectedTask: TaskType }) {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const customContent = main.UI.useCell(
    "prompts",
    selectedTask,
    "content",
    main.STORE_ID,
  );

  const [defaultContent, setDefaultContent] = useState("");
  const [localValue, setLocalValue] = useState(customContent || "");
  const [isLoading, setIsLoading] = useState(true);

  const taskConfig = TASK_CONFIGS.find((c) => c.type === selectedTask);
  const variables = taskConfig?.variables ?? [];

  useEffect(() => {
    setIsLoading(true);

    const template: Parameters<typeof templateCommands.render>[0] =
      selectedTask === "enhance"
        ? {
            enhanceUser: {
              session: {
                event: null,
                title: null,
                startedAt: null,
                endedAt: null,
              },
              participants: [],
              template: null,
              transcripts: [],
              preMeetingMemo: "",
              postMeetingMemo: "",
            },
          }
        : { titleUser: { enhancedNote: "" } };

    void templateCommands
      .render(template)
      .then((result) => {
        if (result.status === "ok") {
          setDefaultContent(result.data);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedTask]);

  useEffect(() => {
    setLocalValue(customContent || "");
  }, [customContent, selectedTask]);

  const handleSave = useCallback(() => {
    if (!store) return;
    const trimmed = localValue.trim();
    if (trimmed) {
      setCustomPrompt(store, selectedTask, trimmed);
    } else {
      deleteCustomPrompt(store, selectedTask);
    }
  }, [store, selectedTask, localValue]);

  const handleReset = useCallback(() => {
    if (!store) return;
    deleteCustomPrompt(store, selectedTask);
    setLocalValue("");
  }, [store, selectedTask]);

  const hasChanges = localValue !== (customContent || "");
  const hasCustomPrompt = !!customContent;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{taskConfig?.label}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {taskConfig?.description}
            </p>
          </div>
          <div className="flex gap-2">
            {hasCustomPrompt && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset to Default
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-neutral-200 bg-neutral-50">
        <h3 className="text-xs font-medium text-neutral-600 mb-2">
          Available Variables
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {variables.map((variable) => (
            <code
              key={variable}
              className="text-xs bg-white border border-neutral-200 px-2 py-0.5 rounded-xs font-mono"
            >
              {"{{ "}
              {variable}
              {" }}"}
            </code>
          ))}
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          <span className="font-medium">Filters:</span>{" "}
          {AVAILABLE_FILTERS.map((filter, i) => (
            <span key={filter}>
              <code className="bg-white border border-neutral-200 px-1 rounded-xs">
                {filter}
              </code>
              {i < AVAILABLE_FILTERS.length - 1 && ", "}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 p-6">
          <div className="h-full border border-neutral-200 rounded-lg overflow-hidden">
            <PromptEditor
              value={localValue}
              onChange={setLocalValue}
              placeholder="Enter your custom prompt template using Jinja2 syntax..."
              variables={variables as string[]}
              filters={[...AVAILABLE_FILTERS]}
            />
          </div>
        </div>

        <div className="border-t border-neutral-200">
          <details className="group">
            <summary className="px-6 py-3 cursor-pointer text-sm font-medium text-neutral-600 hover:bg-neutral-50 list-none flex items-center gap-2">
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Default Template Reference
            </summary>
            <div className="px-6 pb-4 max-h-64 overflow-auto">
              {isLoading ? (
                <div className="text-sm text-neutral-500">Loading...</div>
              ) : (
                <pre className="text-xs bg-neutral-50 p-4 rounded-lg border border-neutral-200 whitespace-pre-wrap font-mono text-neutral-600">
                  {defaultContent || "No default template available"}
                </pre>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
