import { convertFileSrc, invoke } from "@tauri-apps/api/core";

import { createPluginContext } from "./context";
import { getRegisteredPluginModule, setPluginDisplayName } from "./registry";
import type { PluginManifestEntry } from "./types";

let loadingPromise: Promise<void> | null = null;

export function loadPlugins() {
  if (!loadingPromise) {
    loadingPromise = loadPluginsInner();
  }
  return loadingPromise;
}

async function loadPluginsInner() {
  const plugins = await invoke<PluginManifestEntry[]>("list_plugins").catch(
    (error) => {
      console.error("Failed to list plugins", error);
      return [];
    },
  );

  for (const plugin of plugins) {
    setPluginDisplayName(plugin.id, plugin.name);

    const loaded = await loadPluginScript(plugin.mainPath).catch((error) => {
      console.error(`Failed to load plugin script: ${plugin.id}`, error);
      return false;
    });

    if (!loaded) {
      continue;
    }

    const module = getRegisteredPluginModule(plugin.id);
    if (!module) {
      console.error(`Plugin did not register itself: ${plugin.id}`);
      continue;
    }

    await Promise.resolve(module.onload(createPluginContext(plugin.id))).catch(
      (error) => {
        console.error(`Plugin onload failed: ${plugin.id}`, error);
      },
    );
  }
}

function loadPluginScript(path: string) {
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.async = false;
    script.src = convertFileSrc(path);
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}
