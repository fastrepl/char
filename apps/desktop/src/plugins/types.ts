export type PluginManifestEntry = {
  id: string;
  name: string;
  version: string;
  mainPath: string;
};

export type PluginContext = {
  registerView: (viewId: string, factory: () => React.ReactNode) => void;
  openTab: (
    pluginId?: string,
    state?: Partial<Record<string, string | number | boolean | null>>,
  ) => void;
};

export type PluginModule = {
  id: string;
  onload: (ctx: PluginContext) => void | Promise<void>;
  onunload?: () => void | Promise<void>;
};
