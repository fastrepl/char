import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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
