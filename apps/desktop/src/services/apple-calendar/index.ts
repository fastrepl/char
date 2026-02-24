import type { Queries } from "tinybase/with-schemas";

import type { Schemas, Store } from "../../store/tinybase/store/main";
import type * as settings from "../../store/tinybase/store/settings";
import { createCtx } from "./ctx";
import {
  CalendarFetchError,
  fetchExistingEvents,
  fetchIncomingEvents,
} from "./fetch";
import {
  executeForEventsSync,
  executeForParticipantsSync,
  syncEvents,
  syncSessionEmbeddedEvents,
  syncSessionParticipants,
} from "./process";

export const CALENDAR_SYNC_TASK_ID = "calendarSync";

export async function syncCalendarEvents(
  store: Store,
  queries: Queries<Schemas>,
  settingsStore?: settings.Store,
): Promise<void> {
  await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 250)),
    run(store, queries, settingsStore),
  ]);
}

async function run(
  store: Store,
  queries: Queries<Schemas>,
  settingsStore?: settings.Store,
) {
  const ctx = createCtx(store, queries);
  if (!ctx) {
    return null;
  }

  const timezone = settingsStore?.getValue("timezone") as string | undefined;

  let incoming;
  let incomingParticipants;

  try {
    const result = await fetchIncomingEvents(ctx, timezone);
    incoming = result.events;
    incomingParticipants = result.participants;
  } catch (error) {
    if (error instanceof CalendarFetchError) {
      console.error(
        `[calendar-sync] Aborting sync due to fetch error: ${error.message}`,
      );
      return null;
    }
    throw error;
  }

  const existing = fetchExistingEvents(ctx);

  const eventsOut = syncEvents(ctx, {
    incoming,
    existing,
    incomingParticipants,
    timezone,
  });
  executeForEventsSync(ctx, eventsOut);
  syncSessionEmbeddedEvents(ctx, incoming, timezone);

  const participantsOut = syncSessionParticipants(ctx, {
    incomingParticipants,
    timezone,
  });
  executeForParticipantsSync(ctx, participantsOut);
}
