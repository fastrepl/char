import type { Store } from "../../store/main";
import { createJsonFilePersister } from "../factories";

export function createMemoryPersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "memories",
    filename: "memories.json",
    label: "MemoryPersister",
  });
}
