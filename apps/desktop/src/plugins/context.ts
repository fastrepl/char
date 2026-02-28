import { useTabs } from "~/store/zustand/tabs";

import { registerPluginView } from "./registry";
import type { PluginContext } from "./types";

export function createPluginContext(pluginId: string): PluginContext {
  return {
    registerView: (viewId, factory) => {
      registerPluginView(pluginId, viewId, factory);
    },
    openTab: (targetPluginId = pluginId, state) => {
      useTabs.getState().openNew({
        type: "plugin",
        pluginId: targetPluginId,
        state: state ?? {},
      });
    },
  };
}
