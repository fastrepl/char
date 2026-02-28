import { registerPluginView } from "./registry";
import type { PluginContext } from "./types";

import { useTabs } from "~/store/zustand/tabs";

export function createPluginContext(pluginId: string): PluginContext {
  return {
    registerView: (viewId, factory) => {
      registerPluginView(pluginId, viewId, factory);
    },
    openTab: (targetPluginId = pluginId, state) => {
      useTabs.getState().openNew({
        type: "extension",
        extensionId: targetPluginId,
        state: state ?? {},
      });
    },
  };
}
