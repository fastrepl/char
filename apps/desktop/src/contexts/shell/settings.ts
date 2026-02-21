import { useCallback } from "react";

import { useTabs } from "../../store/zustand/tabs";

export function useSettings() {
  const openNew = useTabs((state) => state.openNew);

  const openSettings = useCallback(() => {
    openNew({ type: "settings" });
  }, [openNew]);

  return { openSettings };
}
