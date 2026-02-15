import type { Ctx } from "../../ctx";
import type { IncomingEvent } from "../../fetch/types";
import type { EventsSyncInput, EventsSyncOutput } from "./types";

export function getEventKey(
  trackingId: string,
  startedAt: string | undefined,
  hasRecurrenceRules: boolean,
): string {
  if (hasRecurrenceRules && startedAt) {
    return `${trackingId}::${startedAt}`;
  }
  return trackingId;
}

export function syncEvents(
  ctx: Ctx,
  { incoming, existing }: EventsSyncInput,
): EventsSyncOutput {
  const out: EventsSyncOutput = {
    toDelete: [],
    toUpdate: [],
    toAdd: [],
  };

  const incomingEventMap = new Map(
    incoming.map((e) => [
      getEventKey(e.tracking_id_event, e.started_at, e.has_recurrence_rules),
      e,
    ]),
  );
  const handledEventKeys = new Set<string>();

  for (const storeEvent of existing) {
    if (!ctx.calendarIds.has(storeEvent.calendar_id!)) {
      out.toDelete.push(storeEvent.id);
      continue;
    }

    const trackingId = storeEvent.tracking_id_event;
    let eventKey: string | undefined;
    let matchingIncomingEvent: IncomingEvent | undefined;
    if (!trackingId) {
      eventKey = undefined;
      matchingIncomingEvent = undefined;
    } else if (storeEvent.has_recurrence_rules === undefined) {
      eventKey = getEventKey(trackingId, storeEvent.started_at, false);
      matchingIncomingEvent = incomingEventMap.get(eventKey);
      if (!matchingIncomingEvent) {
        eventKey = getEventKey(trackingId, storeEvent.started_at, true);
        matchingIncomingEvent = incomingEventMap.get(eventKey);
      }
    } else {
      eventKey = getEventKey(
        trackingId,
        storeEvent.started_at,
        storeEvent.has_recurrence_rules,
      );
      matchingIncomingEvent = incomingEventMap.get(eventKey);
    }

    if (matchingIncomingEvent && trackingId && eventKey) {
      out.toUpdate.push({
        ...storeEvent,
        ...matchingIncomingEvent,
        id: storeEvent.id,
        tracking_id_event: trackingId,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
        calendar_id: storeEvent.calendar_id,
        has_recurrence_rules: matchingIncomingEvent.has_recurrence_rules,
      });
      handledEventKeys.add(eventKey);
      continue;
    }

    out.toDelete.push(storeEvent.id);
  }

  for (const incomingEvent of incoming) {
    const incomingEventKey = getEventKey(
      incomingEvent.tracking_id_event,
      incomingEvent.started_at,
      incomingEvent.has_recurrence_rules,
    );
    if (!handledEventKeys.has(incomingEventKey)) {
      out.toAdd.push(incomingEvent);
    }
  }

  return out;
}
