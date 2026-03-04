import { CONFIG_REGISTRY, type ConfigKey } from "./registry";

import * as settings from "~/store/tinybase/store/settings";
import { useListener } from "~/stt/contexts";

type ConfigValueType<K extends ConfigKey> =
  (typeof CONFIG_REGISTRY)[K]["default"];

function tryParseJSON<T>(value: any, fallback: T): T {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function useConfigValue<K extends ConfigKey>(
  key: K,
): ConfigValueType<K> {
  const storedValue = settings.UI.useValue(key, settings.STORE_ID);
  const definition = CONFIG_REGISTRY[key];

  if (storedValue !== undefined) {
    if (key === "ignored_platforms" || key === "spoken_languages") {
      return tryParseJSON(
        storedValue,
        definition.default,
      ) as ConfigValueType<K>;
    }
    return storedValue as ConfigValueType<K>;
  }

  return definition.default as ConfigValueType<K>;
}

export function useConfigValues<K extends ConfigKey>(
  keys: readonly K[],
): { [P in K]: ConfigValueType<P> } {
  const allValues = settings.UI.useValues(settings.STORE_ID);

  const result = {} as { [P in K]: ConfigValueType<P> };

  for (const key of keys) {
    const storedValue = allValues[key];
    const definition = CONFIG_REGISTRY[key];

    if (storedValue !== undefined) {
      if (key === "ignored_platforms" || key === "spoken_languages") {
        result[key] = tryParseJSON(
          storedValue,
          definition.default,
        ) as ConfigValueType<K>;
      } else {
        result[key] = storedValue as ConfigValueType<K>;
      }
    } else {
      result[key] = definition.default as ConfigValueType<K>;
    }
  }

  return result;
}

export function useConfigSideEffects() {
  const configs = useValuesToWatch();

  for (const key of Object.keys(configs) as ConfigKey[]) {
    const definition = CONFIG_REGISTRY[key];

    if ("sideEffect" in definition) {
      const getConfig = <K extends ConfigKey>(k: K): ConfigValueType<K> => {
        const def = CONFIG_REGISTRY[k];
        const val = configs[k];

        if (val !== undefined) {
          if (k === "ignored_platforms" || k === "spoken_languages") {
            return tryParseJSON(val, def.default) as ConfigValueType<K>;
          }
          return val as ConfigValueType<K>;
        }

        return def.default as ConfigValueType<K>;
      };

      type GetConfigFn = <K extends ConfigKey>(k: K) => ConfigValueType<K>;
      const storedValue =
        configs[key] !== undefined ? configs[key] : definition.default;

      try {
        const result = (
          definition.sideEffect as (
            value: unknown,
            getConfig: GetConfigFn,
          ) => void | Promise<void>
        )(storedValue, getConfig);

        Promise.resolve(result).catch((error) => {
          console.error("Side effect error:", error);
        });
      } catch (error) {
        console.error("Side effect error:", error);
      }
    }
  }
}

function useValuesToWatch(): Partial<Record<ConfigKey, any>> {
  const inactive = useListener((state) => state.live.status === "inactive");
  const keys = inactive ? (Object.keys(CONFIG_REGISTRY) as ConfigKey[]) : [];
  const allValues = settings.UI.useValues(settings.STORE_ID);

  return keys.reduce<Partial<Record<ConfigKey, any>>>((acc, key) => {
    acc[key] = allValues[key];
    return acc;
  }, {});
}
