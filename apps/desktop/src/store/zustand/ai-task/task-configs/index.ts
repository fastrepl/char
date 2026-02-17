import type { LanguageModel, TextStreamPart } from "ai";

import type {
  EnhanceSystem,
  EnhanceUser,
  TitleSystem,
  TitleUser,
} from "@hypr/plugin-template";

import type { ProviderId } from "../../../../components/settings/ai/llm/shared";
import type { Store as MainStore } from "../../../tinybase/store/main";
import type { Store as SettingsStore } from "../../../tinybase/store/settings";
import { StreamTransform } from "../shared/transform_infra";
import type { TaskStepInfo } from "../tasks";
import { enhanceTransform } from "./enhance-transform";
import { enhanceWorkflow } from "./enhance-workflow";
import { titleTransform } from "./title-transform";
import { titleWorkflow } from "./title-workflow";

export type TaskType = "enhance" | "title";

export interface TaskArgsMap {
  enhance: { sessionId: string; enhancedNoteId: string; templateId?: string };
  title: { sessionId: string };
}

export interface TaskArgsMapTransformed {
  enhance: EnhanceSystem & EnhanceUser;
  title: TitleSystem & TitleUser;
}

export type TaskId<T extends TaskType = TaskType> = `${string}-${T}`;

export function createTaskId<T extends TaskType>(
  entityId: string,
  taskType: T,
): TaskId<T> {
  return `${entityId}-${taskType}` as TaskId<T>;
}

export interface TaskConfig<T extends TaskType = TaskType> {
  transformArgs: (
    args: TaskArgsMap[T],
    store: MainStore,
    settingsStore: SettingsStore,
  ) => Promise<TaskArgsMapTransformed[T]>;
  executeWorkflow: (params: {
    model: LanguageModel;
    args: TaskArgsMapTransformed[T];
    onProgress: (step: TaskStepInfo<T>) => void;
    signal: AbortSignal;
    store: MainStore;
    providerId?: ProviderId;
  }) => AsyncIterable<TextStreamPart<any>>;
  transforms?: StreamTransform[];
}

type TaskConfigMap = {
  [K in TaskType]: TaskConfig<K>;
};

export const TASK_CONFIGS: TaskConfigMap = {
  enhance: {
    ...enhanceWorkflow,
    ...enhanceTransform,
  },
  title: {
    ...titleWorkflow,
    ...titleTransform,
  },
};
