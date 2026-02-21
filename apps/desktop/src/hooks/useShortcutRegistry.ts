import { useQuery } from "@tanstack/react-query";
import type { DependencyList } from "react";
import { useMemo } from "react";
import { type Options, useHotkeys } from "react-hotkeys-hook";

import {
  commands as shortcutCommands,
  type ShortcutId,
} from "@hypr/plugin-shortcut";

export function useShortcutRegistry() {
  const { data: shortcuts } = useQuery({
    queryKey: ["shortcuts", "all"],
    queryFn: () => shortcutCommands.getAllShortcuts(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const keysMap = useMemo(() => {
    if (!shortcuts) return new Map<ShortcutId, string>();
    return new Map(shortcuts.map((s) => [s.id, s.keys]));
  }, [shortcuts]);

  return { shortcuts, keysMap };
}

export function useShortcutKeys(id: ShortcutId): string {
  const { keysMap } = useShortcutRegistry();
  return keysMap.get(id) ?? "";
}

export function useScopedShortcut(
  id: ShortcutId,
  handler: (e: KeyboardEvent) => void,
  options?: Omit<Options, "enabled">,
  deps?: DependencyList,
): void {
  const keys = useShortcutKeys(id);
  useHotkeys(keys, handler, { ...options, enabled: !!keys }, deps ?? []);
}
