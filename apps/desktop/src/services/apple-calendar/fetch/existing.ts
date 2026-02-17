import type { Ctx } from "../ctx";
import type { ExistingEvent } from "./types";

function isEventInRange(
  startedAt: string,
  endedAt: string | undefined,
  from: Date,
  to: Date,
): boolean {
  const eventStart = new Date(startedAt);
  const eventEnd = endedAt ? new Date(endedAt) : eventStart;

  return eventStart <= to && eventEnd >= from;
}

export function fetchExistingEvents(ctx: Ctx): ExistingEvent[] {
  const events: ExistingEvent[] = [];

  ctx.store.forEachRow("events", (rowId, _forEachCell) => {
    const event = ctx.store.getRow("events", rowId);
    if (!event) return;

    const calendarId = event.calendar_id as string | undefined;
    if (!calendarId) {
      return;
    }

    const startedAt = event.started_at as string | undefined;
    if (!startedAt) return;

    const endedAt = event.ended_at as string | undefined;
    if (isEventInRange(startedAt, endedAt, ctx.from, ctx.to)) {
      events.push({
        id: rowId,
        tracking_id_event: event.tracking_id_event as string | undefined,
        user_id: event.user_id as string | undefined,
        created_at: event.created_at as string | undefined,
        calendar_id: calendarId,
        title: event.title as string | undefined,
        started_at: startedAt,
        ended_at: endedAt,
        location: event.location as string | undefined,
        meeting_link: event.meeting_link as string | undefined,
        description: event.description as string | undefined,
        note: event.note as string | undefined,
        recurrence_series_id: event.recurrence_series_id as string | undefined,
        has_recurrence_rules: event.has_recurrence_rules as boolean | undefined,
      });
    }
  });

  return events;
}
