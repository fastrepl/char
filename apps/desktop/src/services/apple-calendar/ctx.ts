import type { Queries } from "tinybase/with-schemas";

import { commands as calendarCommands } from "@hypr/plugin-calendar";

import { findCalendarByTrackingId } from "~/calendar/utils";
import { QUERIES, type Schemas, type Store } from "~/store/tinybase/store/main";

// ---

export interface Ctx {
  store: Store;
  userId: string;
  from: Date;
  to: Date;
  calendarIds: Set<string>;
  calendarTrackingIdToId: Map<string, string>;
}

// ---

export function createCtx(store: Store, queries: Queries<Schemas>): Ctx | null {
  const resultTable = queries.getResultTable(QUERIES.enabledAppleCalendars);

  const calendarIds = new Set(Object.keys(resultTable));
  const calendarTrackingIdToId = new Map<string, string>();

  for (const calendarId of calendarIds) {
    const calendar = store.getRow("calendars", calendarId);
    const trackingId = calendar?.tracking_id_calendar as string | undefined;
    if (trackingId) {
      calendarTrackingIdToId.set(trackingId, calendarId);
    }
  }

  if (calendarTrackingIdToId.size === 0) {
    return null;
  }

  const userId = store.getValue("user_id");
  if (!userId) {
    return null;
  }

  const { from, to } = getRange();

  return {
    store,
    userId: String(userId),
    from,
    to,
    calendarIds,
    calendarTrackingIdToId,
  };
}

// ---

export async function syncCalendars(store: Store): Promise<void> {
  const userId = store.getValue("user_id");
  if (!userId) return;

  const result = await calendarCommands.listCalendars("apple");
  if (result.status === "error") return;

  const incomingCalendars = result.data;
  const incomingIds = new Set(incomingCalendars.map((cal) => cal.id));

  store.transaction(() => {
    for (const rowId of store.getRowIds("calendars")) {
      const row = store.getRow("calendars", rowId);
      if (
        row.provider === "apple" &&
        !incomingIds.has(row.tracking_id_calendar as string)
      ) {
        store.delRow("calendars", rowId);
      }
    }

    for (const cal of incomingCalendars) {
      const existingRowId = findCalendarByTrackingId(store, cal.id);
      const rowId = existingRowId ?? crypto.randomUUID();
      const existing = existingRowId
        ? store.getRow("calendars", existingRowId)
        : null;

      store.setRow("calendars", rowId, {
        user_id: String(userId),
        created_at: existing?.created_at || new Date().toISOString(),
        tracking_id_calendar: cal.id,
        name: cal.title,
        enabled: existing?.enabled ?? false,
        provider: "apple",
        source: cal.source ?? "Apple Calendar",
        color: cal.color ?? "#888",
      });
    }
  });
}

// ---

const getRange = () => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);
  return { from, to };
};
