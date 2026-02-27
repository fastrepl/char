import type { Ctx } from "~/services/apple-calendar/ctx";
import { eventMatchingKey } from "~/session/utils";

import type { CalendarEvent } from "@hypr/plugin-apple-calendar";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as miscCommands } from "@hypr/plugin-misc";

import type {
  EventParticipant,
  IncomingEvent,
  IncomingParticipants,
} from "./types";

export class CalendarFetchError extends Error {
  constructor(
    public readonly calendarTrackingId: string,
    public readonly cause: string,
  ) {
    super(
      `Failed to fetch events for calendar ${calendarTrackingId}: ${cause}`,
    );
    this.name = "CalendarFetchError";
  }
}

export async function fetchIncomingEvents(
  ctx: Ctx,
  timezone?: string,
): Promise<{
  events: IncomingEvent[];
  participants: IncomingParticipants;
}> {
  const trackingIds = Array.from(ctx.calendarTrackingIdToId.keys());

  const results = await Promise.all(
    trackingIds.map(async (trackingId) => {
      const result = await appleCalendarCommands.listEvents({
        calendar_tracking_id: trackingId,
        from: ctx.from.toISOString(),
        to: ctx.to.toISOString(),
      });

      if (result.status === "error") {
        throw new CalendarFetchError(trackingId, result.error);
      }

      return result.data;
    }),
  );

  const calendarEvents = results.flat();
  const events: IncomingEvent[] = [];
  const participants: IncomingParticipants = new Map();

  for (const calendarEvent of calendarEvents) {
    const { event, eventParticipants } =
      await normalizeCalendarEvent(calendarEvent);
    events.push(event);
    if (eventParticipants.length > 0) {
      const key = eventMatchingKey(event, timezone);
      participants.set(key, eventParticipants);
    }
  }

  return { events, participants };
}

async function normalizeCalendarEvent(calendarEvent: CalendarEvent): Promise<{
  event: IncomingEvent;
  eventParticipants: EventParticipant[];
}> {
  const meetingLink =
    calendarEvent.meeting_link ??
    (await extractMeetingLink(
      calendarEvent.description,
      calendarEvent.location,
    ));

  const eventParticipants: EventParticipant[] = [];

  if (calendarEvent.organizer) {
    eventParticipants.push({
      name: calendarEvent.organizer.name ?? undefined,
      email: calendarEvent.organizer.email ?? undefined,
      is_organizer: true,
      is_current_user: calendarEvent.organizer.is_current_user,
    });
  }

  for (const attendee of calendarEvent.attendees) {
    eventParticipants.push({
      name: attendee.name ?? undefined,
      email: attendee.email ?? undefined,
      is_organizer: false,
      is_current_user: attendee.is_current_user,
    });
  }

  return {
    event: {
      // FIXME: this is a temporary workaround for not having to migrate everything at once
      // apple calendar events have the id format of eventIdentifier:startDate if and only if they are recurrent
      tracking_id_event: calendarEvent.has_recurrence_rules
        ? calendarEvent.id.split(":").slice(0, -1).join(":")
        : calendarEvent.id,
      tracking_id_calendar: calendarEvent.calendar_id,
      title: calendarEvent.title,
      started_at: calendarEvent.started_at,
      ended_at: calendarEvent.ended_at,
      location: calendarEvent.location ?? undefined,
      meeting_link: meetingLink ?? undefined,
      description: calendarEvent.description ?? undefined,
      recurrence_series_id: calendarEvent.recurring_event_id ?? undefined,
      has_recurrence_rules: calendarEvent.has_recurrence_rules,
      is_all_day: calendarEvent.is_all_day,
    },
    eventParticipants,
  };
}

async function extractMeetingLink(
  ...texts: (string | undefined | null)[]
): Promise<string | undefined> {
  for (const text of texts) {
    if (!text) continue;
    const result = await miscCommands.parseMeetingLink(text);
    if (result) return result;
  }
  return undefined;
}
