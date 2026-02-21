import { useCallback, useState } from "react";

import { useScopedShortcut } from "../../hooks/useShortcutRegistry";

export function useLeftSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [showDevtool, setShowDevtool] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const toggleDevtool = useCallback(() => {
    setShowDevtool((prev) => !prev);
  }, []);

  useScopedShortcut(
    "toggle_sidebar",
    toggleExpanded,
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
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
