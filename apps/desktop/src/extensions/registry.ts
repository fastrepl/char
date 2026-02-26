import {
  commands,
  type ExtensionInfo,
  type PanelInfo,
} from "@hypr/plugin-extensions";

const loadedPanels: Map<string, PanelInfo> = new Map();
const extensionPanels: Map<string, PanelInfo[]> = new Map();
let panelsLoaded = false;

export async function listInstalledExtensions(): Promise<ExtensionInfo[]> {
  const result = await commands.listExtensions();
  if (result.status === "ok") {
    return result.data;
  }
  console.error("Failed to list extensions:", result.error);
  return [];
}

export async function getExtension(
  extensionId: string,
): Promise<ExtensionInfo | null> {
  const result = await commands.getExtension(extensionId);
  if (result.status === "ok") {
    return result.data;
  }
  return null;
}

export async function getExtensionsDir(): Promise<string | null> {
  const result = await commands.getExtensionsDir();
  if (result.status === "ok") {
    return result.data;
  }
  return null;
}

export function getPanelInfo(panelId: string): PanelInfo | undefined {
  return loadedPanels.get(panelId);
}

export function getPanelInfoByExtensionId(
  extensionId: string,
): PanelInfo | undefined {
  const panels = extensionPanels.get(extensionId);
  return panels?.[0];
}

export async function loadExtensionPanels(): Promise<void> {
  if (panelsLoaded) {
    return;
  }

  try {
    const extensions = await listInstalledExtensions();

    for (const ext of extensions) {
      const panels: PanelInfo[] = [];
      for (const panel of ext.panels) {
        loadedPanels.set(panel.id, panel);
        panels.push(panel);
      }
      extensionPanels.set(ext.id, panels);
    }

    panelsLoaded = true;
  } catch (err) {
    console.error("Failed to load extension panels:", err);
  }
}

export function getLoadedPanels(): PanelInfo[] {
  return Array.from(loadedPanels.values());
}
