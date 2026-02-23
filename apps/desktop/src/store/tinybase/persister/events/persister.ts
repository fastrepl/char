import type { Store } from "../../store/main";
import { createJsonFilePersister } from "../factories";

export function createEventPersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "events",
    filename: "events.json",
    label: "EventPersister",
    jsonFields: {
      participants_json: "participants",
    },
  });
}
