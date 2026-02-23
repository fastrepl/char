import type { EventStorage, SessionEvent } from "@hypr/store";

import { id } from "../../../../utils";
import {
  eventMatchingKey,
  getSessionEventById,
  sessionEventMatchingKey,
} from "../../../../utils/session-event";
import type { Ctx } from "../../ctx";
import type { IncomingEvent } from "../../fetch/types";
import type { EventsSyncOutput } from "./types";

export function executeForEventsSync(ctx: Ctx, out: EventsSyncOutput): void {
  const userId = ctx.store.getValue("user_id");
  if (!userId) {
    throw new Error("user_id is not set");
  }

  const now = new Date().toISOString();

  ctx.store.transaction(() => {
    for (const eventId of out.toDelete) {
      ctx.store.delRow("events", eventId);
    }

    for (const event of out.toUpdate) {
      ctx.store.setPartialRow("events", event.id, {
        tracking_id_event: event.tracking_id_event,
        calendar_id: event.calendar_id,
        title: event.title,
        started_at: event.started_at,
        ended_at: event.ended_at,
        location: event.location,
        meeting_link: event.meeting_link,
        description: event.description,
        recurrence_series_id: event.recurrence_series_id,
        has_recurrence_rules: event.has_recurrence_rules,
        is_all_day: event.is_all_day,
      });
    }

    for (const incomingEvent of out.toAdd) {
      const calendarId = ctx.calendarTrackingIdToId.get(
        incomingEvent.tracking_id_calendar,
      );
      if (!calendarId) {
        continue;
      }

      const eventId = id();

      ctx.store.setRow("events", eventId, {
        user_id: userId,
        created_at: now,
        tracking_id_event: incomingEvent.tracking_id_event,
        calendar_id: calendarId,
        title: incomingEvent.title ?? "",
        started_at: incomingEvent.started_at ?? "",
        ended_at: incomingEvent.ended_at ?? "",
        location: incomingEvent.location,
        meeting_link: incomingEvent.meeting_link,
        description: incomingEvent.description,
        recurrence_series_id: incomingEvent.recurrence_series_id,
        has_recurrence_rules: incomingEvent.has_recurrence_rules,
        is_all_day: incomingEvent.is_all_day,
      } satisfies EventStorage);
    }
  });
}

export function syncSessionEmbeddedEvents(
  ctx: Ctx,
  incoming: IncomingEvent[],
  timezone?: string,
): void {
  const incomingByKey = new Map<string, IncomingEvent>();
  for (const event of incoming) {
    incomingByKey.set(eventMatchingKey(event, timezone), event);
  }

  ctx.store.transaction(() => {
    ctx.store.forEachRow("sessions", (sessionId, _forEachCell) => {
      const sessionEvent = getSessionEventById(ctx.store, sessionId);
      if (!sessionEvent) return;
      const key = sessionEventMatchingKey(sessionEvent, timezone);

      const incomingEvent = incomingByKey.get(key);
      if (!incomingEvent) return;

      const calendarId =
        ctx.calendarTrackingIdToId.get(incomingEvent.tracking_id_calendar) ??
        "";

      const updated: SessionEvent = {
        tracking_id: incomingEvent.tracking_id_event,
        calendar_id: calendarId,
        title: incomingEvent.title ?? "",
        started_at: incomingEvent.started_at ?? "",
        ended_at: incomingEvent.ended_at ?? "",
        is_all_day: incomingEvent.is_all_day,
        has_recurrence_rules: incomingEvent.has_recurrence_rules,
        location: incomingEvent.location,
        meeting_link: incomingEvent.meeting_link,
        description: incomingEvent.description,
        recurrence_series_id: incomingEvent.recurrence_series_id,
      };

      ctx.store.setPartialRow("sessions", sessionId, {
        event_json: JSON.stringify(updated),
      });
    });
  });
}
