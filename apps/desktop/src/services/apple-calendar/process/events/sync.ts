import type { Ctx } from "~/services/apple-calendar/ctx";
import type { IncomingEvent } from "~/services/apple-calendar/fetch/types";
import { eventMatchingKey } from "~/session/utils";

import type { EventsSyncInput, EventsSyncOutput } from "./types";

export function syncEvents(
  ctx: Ctx,
  { incoming, existing, incomingParticipants, timezone }: EventsSyncInput,
): EventsSyncOutput {
  const out: EventsSyncOutput = {
    toDelete: [],
    toUpdate: [],
    toAdd: [],
  };

  const incomingEventMap = new Map(
    incoming.map((e) => [eventMatchingKey(e, timezone), e]),
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
      eventKey = eventMatchingKey(
        {
          tracking_id_event: trackingId,
          started_at: storeEvent.started_at,
          has_recurrence_rules: false,
        },
        timezone,
      );
      matchingIncomingEvent = incomingEventMap.get(eventKey);
      if (!matchingIncomingEvent) {
        eventKey = eventMatchingKey(
          {
            tracking_id_event: trackingId,
            started_at: storeEvent.started_at,
            has_recurrence_rules: true,
          },
          timezone,
        );
        matchingIncomingEvent = incomingEventMap.get(eventKey);
      }
    } else {
      eventKey = eventMatchingKey(
        {
          tracking_id_event: trackingId,
          started_at: storeEvent.started_at,
          has_recurrence_rules: storeEvent.has_recurrence_rules,
        },
        timezone,
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
        participants: incomingParticipants.get(eventKey) ?? [],
      });
      handledEventKeys.add(eventKey);
      continue;
    }

    out.toDelete.push(storeEvent.id);
  }

  for (const incomingEvent of incoming) {
    const incomingEventKey = eventMatchingKey(incomingEvent, timezone);
    if (!handledEventKeys.has(incomingEventKey)) {
      out.toAdd.push({
        ...incomingEvent,
        participants: incomingParticipants.get(incomingEventKey) ?? [],
      });
    }
  }

  return out;
}
