import { disable, enable } from "@tauri-apps/plugin-autostart";

import { commands as detectCommands } from "@hypr/plugin-detect";
import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";

export type ConfigKey =
  | "autostart"
  | "notification_detect"
  | "notification_event"
  | "respect_dnd"
  | "ignored_platforms"
  | "mic_active_threshold"
  | "current_stt_provider"
  | "current_stt_model"
  | "ai_language"
  | "spoken_languages"
  | "save_recordings"
  | "telemetry_consent"
  | "current_llm_provider"
  | "current_llm_model"
  | "timezone"
  | "week_start";

type ConfigValueType<K extends ConfigKey> =
  (typeof CONFIG_REGISTRY)[K]["default"];

interface ConfigDefinition<T = any> {
  key: ConfigKey;
  default: T;
  sideEffect?: (
    value: T,
    getConfig: <K extends ConfigKey>(key: K) => ConfigValueType<K>,
  ) => void | Promise<void>;
}

export const CONFIG_REGISTRY = {
  autostart: {
    key: "autostart",
    default: false,
    sideEffect: async (value: boolean, _) => {
      if (value) {
        await enable();
      } else {
        await disable();
      }
    },
  },

  notification_detect: {
    key: "notification_detect",
    default: true,
  },

  notification_event: {
    key: "notification_event",
    default: true,
  },

  respect_dnd: {
    key: "respect_dnd",
    default: false,
    sideEffect: async (value: boolean, _) => {
      await detectCommands.setRespectDoNotDisturb(value);
    },
  },

  ignored_platforms: {
    key: "ignored_platforms",
    default: [] as string[],
    sideEffect: async (value: string[], _) => {
      await detectCommands.setIgnoredBundleIds(value);
    },
  },

  mic_active_threshold: {
    key: "mic_active_threshold",
    default: 15,
    sideEffect: async (value: number, _) => {
      await detectCommands.setMicActiveThreshold(value);
    },
  },

  current_stt_provider: {
    key: "current_stt_provider",
    default: undefined,
    sideEffect: async (_value: string | undefined, getConfig) => {
      const provider = getConfig("current_stt_provider") as string | undefined;
      const model = getConfig("current_stt_model") as string | undefined;

      if (
        provider === "hyprnote" &&
        model &&
        model !== "cloud" &&
        (model.startsWith("am-") || model.startsWith("Quantized"))
      ) {
        await localSttCommands.startServer(model as SupportedSttModel);
      }
    },
  },

  current_stt_model: {
    key: "current_stt_model",
    default: undefined,
    sideEffect: async (_value: string | undefined, getConfig) => {
      const provider = getConfig("current_stt_provider") as string | undefined;
      const model = getConfig("current_stt_model") as string | undefined;

      if (
        provider === "hyprnote" &&
        model &&
        model !== "cloud" &&
        (model.startsWith("am-") || model.startsWith("Quantized"))
      ) {
        await localSttCommands.startServer(model as SupportedSttModel);
      } else {
        await localSttCommands.stopServer(null);
      }
    },
  },

  ai_language: {
    key: "ai_language",
    default: "en",
  },

  spoken_languages: {
    key: "spoken_languages",
    default: ["en"] as string[],
  },

  save_recordings: {
    key: "save_recordings",
    default: true,
  },

  telemetry_consent: {
    key: "telemetry_consent",
    default: true,
  },

  current_llm_provider: {
    key: "current_llm_provider",
    default: undefined,
  },

  current_llm_model: {
    key: "current_llm_model",
    default: undefined,
  },

  timezone: {
    key: "timezone",
    default: undefined as string | undefined,
  },

  week_start: {
    key: "week_start",
    default: undefined as "sunday" | "monday" | undefined,
  },
} satisfies Record<ConfigKey, ConfigDefinition>;
