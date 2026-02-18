import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useShortcutKeys } from "../../hooks/useShortcutRegistry";

export function useLeftSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [showDevtool, setShowDevtool] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const toggleDevtool = useCallback(() => {
    setShowDevtool((prev) => !prev);
  }, []);

  const toggleSidebarKeys = useShortcutKeys("toggle_sidebar");

  useHotkeys(
    toggleSidebarKeys,
    toggleExpanded,
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
      enabled: !!toggleSidebarKeys,
    },
    [toggleExpanded],
  );

  return {
    expanded,
    setExpanded,
    toggleExpanded,
    showDevtool,
    setShowDevtool,
    toggleDevtool,
  };
}
