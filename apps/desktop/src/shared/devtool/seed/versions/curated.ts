import curatedData from "~/shared/devtool/seed/data/curated.json";
import {
  CuratedDataSchema,
  loadCuratedData,
} from "~/shared/devtool/seed/data/loader";
import type { SeedDefinition } from "~/shared/devtool/seed/shared";
import type { Store as MainStore } from "~/store/tinybase/store/main";

export const curatedSeed: SeedDefinition = {
  id: "curated",
  label: "Curated",
  calendarFixtureBase: "default",
  run: async (store: MainStore, _fixtureCalendars) => {
    const validated = CuratedDataSchema.parse(curatedData);
    const tables = loadCuratedData(validated);
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
      store.setTables(tables);
    });
  },
};
