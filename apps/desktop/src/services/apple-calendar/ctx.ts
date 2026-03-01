import type { Queries } from "tinybase/with-schemas";

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

const getRange = () => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);
  return { from, to };
};
