import type { SeedDefinition } from "~/shared/devtool/seed/shared";
import type { Store as MainStore } from "~/store/tinybase/store/main";

export const emptySeed: SeedDefinition = {
  id: "empty",
  label: "Empty",
  calendarFixtureBase: "default",
  run: async (store: MainStore, _fixtureCalendars) => {
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
    });
  },
};
