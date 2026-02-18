import { useEffect } from "react";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createMergeableStore,
  createQueries,
  type MergeableStore,
  type TablesSchema,
  type ValuesSchema,
} from "tinybase/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useSettingsPersister } from "../persister/settings";
import { registerSaveHandler } from "./save";

export const STORE_ID = "settings";

export const SETTINGS_MAPPING = {
  values: {
    autostart: { type: "boolean", path: ["general", "autostart"] },
    save_recordings: {
      type: "boolean",
      path: ["general", "save_recordings"],
    },
    notification_event: {
      type: "boolean",
      path: ["notification", "event"],
    },
    notification_detect: {
      type: "boolean",
      path: ["notification", "detect"],
    },
    respect_dnd: { type: "boolean", path: ["notification", "respect_dnd"] },
    telemetry_consent: {
      type: "boolean",
      path: ["general", "telemetry_consent"],
    },
    ai_language: { type: "string", path: ["language", "ai_language"] },
    spoken_languages: {
      type: "string",
      path: ["language", "spoken_languages"],
    },
    ignored_platforms: {
      type: "string",
      path: ["notification", "ignored_platforms"],
    },
    mic_active_threshold: {
      type: "number",
      path: ["notification", "mic_active_threshold"],
    },
    current_llm_provider: {
      type: "string",
      path: ["ai", "current_llm_provider"],
    },
    current_llm_model: {
      type: "string",
      path: ["ai", "current_llm_model"],
    },
    current_stt_provider: {
      type: "string",
      path: ["ai", "current_stt_provider"],
    },
    current_stt_model: {
      type: "string",
      path: ["ai", "current_stt_model"],
    },
    cactus_model_path: {
      type: "string",
      path: ["ai", "cactus_model_path"],
    },
    timezone: {
      type: "string",
      path: ["general", "timezone"],
    },
    week_start: {
      type: "string",
      path: ["general", "week_start"],
    },
  },
  tables: {
    ai_providers: {
      schema: {
        type: { type: "string" },
        base_url: { type: "string" },
        api_key: { type: "string" },
      },
    },
  },
} as const;

type ValueType = "boolean" | "string" | "number";
type ValueMapping = { type: ValueType; path: readonly [string, string] };

type DeriveValuesSchema<T extends Record<string, ValueMapping>> = {
  [K in keyof T]: { type: T[K]["type"] };
};

export const SCHEMA = {
  value: Object.fromEntries(
    Object.entries(SETTINGS_MAPPING.values).map(([key, config]) => [
      key,
      { type: config.type },
    ]),
  ) as DeriveValuesSchema<
    typeof SETTINGS_MAPPING.values
  > satisfies ValuesSchema,
  table: Object.fromEntries(
    Object.entries(SETTINGS_MAPPING.tables).map(([key, config]) => [
      key,
      config.schema,
    ]),
  ) as {
    ai_providers: typeof SETTINGS_MAPPING.tables.ai_providers.schema;
  } satisfies TablesSchema,
} as const;

export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

const {
  useCreateMergeableStore,
  useCreateSynchronizer,
  useCreateQueries,
  useProvideStore,
  useProvidePersister,
  useProvideSynchronizer,
  useProvideQueries,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;

export const QUERIES = {
  llmProviders: "llmProviders",
  sttProviders: "sttProviders",
} as const;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value),
  );

  const persister = useSettingsPersister(store as Store);

  useEffect(() => {
    if (!persister) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    return registerSaveHandler("settings", async () => {
      await persister.save();
    });
  }, [persister]);

  const synchronizer = useCreateSynchronizer(store, async (store) =>
    createBroadcastChannelSynchronizer(store, "hypr-sync-settings").startSync(),
  );

  const queries = useCreateQueries(store, (store) =>
    createQueries(store)
      .setQueryDefinition(
        QUERIES.llmProviders,
        "ai_providers",
        ({ select, where }) => {
          select("type");
          select("base_url");
          select("api_key");
          where((getCell) => getCell("type") === "llm");
        },
      )
      .setQueryDefinition(
        QUERIES.sttProviders,
        "ai_providers",
        ({ select, where }) => {
          select("type");
          select("base_url");
          select("api_key");
          where((getCell) => getCell("type") === "stt");
        },
      ),
  );

  useProvideStore(STORE_ID, store);
  useProvideQueries(STORE_ID, queries!);
  useProvidePersister(STORE_ID, persister);
  useProvideSynchronizer(STORE_ID, synchronizer);

  return null;
};

export const SETTINGS_VALUE_KEYS = Object.keys(
  SETTINGS_MAPPING.values,
) as (keyof typeof SETTINGS_MAPPING.values)[];
