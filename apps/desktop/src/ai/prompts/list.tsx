import { CheckIcon, SparklesIcon } from "lucide-react";
import * as main from "~/store/tinybase/store/main";
import { TASK_CONFIGS, type TaskType } from "~/store/tinybase/store/prompts";

import { cn } from "@hypr/utils";

export function PromptsListColumn({
  selectedTask,
  setSelectedTask,
}: {
  selectedTask: TaskType | null;
  setSelectedTask: (id: string | null) => void;
}) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="border-b border-neutral-200 py-2 pl-3 pr-1 flex items-center justify-between h-12">
        <h3 className="text-sm font-medium">Custom Prompts</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {TASK_CONFIGS.map((config) => (
            <TaskItem
              key={config.type}
              taskType={config.type}
              label={config.label}
              description={config.description}
              isSelected={selectedTask === config.type}
              onClick={() => setSelectedTask(config.type)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  taskType,
  label,
  description,
  isSelected,
  onClick,
}: {
  taskType: TaskType;
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const content = main.UI.useCell(
    "prompts",
    taskType,
    "content",
    main.STORE_ID,
  );
  const hasCustomPrompt = !!content;

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100 transition-colors",
        isSelected ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-4 w-4 text-neutral-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1.5">
            {label}
            {hasCustomPrompt && (
              <span className="flex items-center gap-0.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-xs">
                <CheckIcon className="w-3 h-3" />
                Custom
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500 truncate">{description}</div>
        </div>
      </div>
    </button>
  );
}
