import type { SessionEvent } from "@hypr/store";
import { format, safeParseDate, TZDate } from "@hypr/utils";

import type * as main from "../store/tinybase/store/main";

type Store = NonNullable<ReturnType<typeof main.UI.useStore>>;

export function getSessionEvent(session: {
  event_json?: string | null;
}): SessionEvent | null {
  const eventJson = session.event_json;
  if (!eventJson) return null;
  try {
    return JSON.parse(eventJson) as SessionEvent;
  } catch {
    return null;
  }
}

export function getSessionEventById(
  store: Store,
  sessionId: string,
): SessionEvent | null {
  const row = store.getRow("sessions", sessionId);
  if (!row) return null;
  return getSessionEvent(row);
}

function dayFromDate(
  dateStr: string | null | undefined,
  timezone?: string,
): string {
  const parsed = safeParseDate(dateStr);
  if (!parsed) return "1970-01-01";
  const date = timezone ? new TZDate(parsed, timezone) : parsed;
  return format(date, "yyyy-MM-dd");
}

export function eventMatchingKey(
  event: {
    tracking_id_event?: string | null;
    started_at?: string | null;
    has_recurrence_rules?: boolean;
  },
  timezone?: string,
): string {
  const trackingId = event.tracking_id_event ?? "";
  if (event.has_recurrence_rules) {
    return `${trackingId}:${dayFromDate(event.started_at, timezone)}`;
  }
  return trackingId;
}

export function sessionEventMatchingKey(
  event: SessionEvent,
  timezone?: string,
): string {
  if (event.has_recurrence_rules) {
    return `${event.tracking_id}:${dayFromDate(event.started_at, timezone)}`;
  }
  return event.tracking_id;
}

export function findSessionByKey(
  store: Store,
  key: string,
  timezone?: string,
): string | null {
  let found: string | null = null;
  store.forEachRow("sessions", (rowId, _forEachCell) => {
    if (found) return;
    const sessionEvent = getSessionEventById(store, rowId);
    if (!sessionEvent) return;
    if (sessionEventMatchingKey(sessionEvent, timezone) === key) {
      found = rowId;
      return;
    }
    if (matchesWithFallback(sessionEvent, key, timezone)) {
      found = rowId;
    }
  });
  return found;
}

function matchesWithFallback(
  sessionEvent: SessionEvent,
  targetKey: string,
  timezone?: string,
): boolean {
  const colonIdx = targetKey.indexOf(":");
  if (colonIdx === -1) {
    return false;
  }

  const targetTrackingId = targetKey.substring(0, colonIdx);
  const targetDay = targetKey.substring(colonIdx + 1);
  if (sessionEvent.tracking_id !== targetTrackingId) {
    return false;
  }
  const sessionDay = dayFromDate(sessionEvent.started_at, timezone);
  return sessionDay === targetDay;
}

export function findSessionByTrackingId(
  store: Store,
  trackingId: string,
  day?: string,
): string | null {
  const key = day ? `${trackingId}:${day}` : trackingId;
  return findSessionByKey(store, key);
}

export function findSessionByEventId(
  store: Store,
  eventId: string,
  timezone?: string,
): string | null {
  if (!store.hasRow("events", eventId)) return null;
  const event = store.getRow("events", eventId);
  if (!event) return null;
  const key = eventMatchingKey(event, timezone);
  return findSessionByKey(store, key, timezone);
}
