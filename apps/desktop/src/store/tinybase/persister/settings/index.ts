import * as _UI from "tinybase/ui-react/with-schemas";
import type { Schemas, Store } from "~/store/tinybase/store/settings";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { createSettingsPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useSettingsPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createSettingsPersister(store as Store);
      if (getCurrentWebviewWindowLabel() === "main") {
        await persister.startAutoPersisting();
      } else {
        await persister.startAutoLoad();
      }
      return persister;
    },
    [],
  );
}
