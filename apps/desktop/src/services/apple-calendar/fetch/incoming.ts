import type { AppleEvent, Participant } from "@hypr/plugin-apple-calendar";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as miscCommands } from "@hypr/plugin-misc";

import { eventMatchingKey } from "../../../utils/session-event";
import type { Ctx } from "../ctx";
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

  const appleEvents = results.flat();
  const events: IncomingEvent[] = [];
  const participants: IncomingParticipants = new Map();

  for (const appleEvent of appleEvents) {
    const { event, eventParticipants } = await normalizeAppleEvent(appleEvent);
    events.push(event);
    if (eventParticipants.length > 0) {
      const key = eventMatchingKey(event, timezone);
      participants.set(key, eventParticipants);
    }
  }

  return { events, participants };
}

async function normalizeAppleEvent(appleEvent: AppleEvent): Promise<{
  event: IncomingEvent;
  eventParticipants: EventParticipant[];
}> {
  const meetingLink =
    appleEvent.url ??
    (await extractMeetingLink(appleEvent.notes, appleEvent.location));

  const eventParticipants: EventParticipant[] = [];
  let normalizedOrganizer: EventParticipant | undefined;

  if (appleEvent.organizer) {
    normalizedOrganizer = normalizeParticipant(appleEvent.organizer, true);
    eventParticipants.push(normalizedOrganizer);
  }

  for (const attendee of appleEvent.attendees) {
    const normalizedAttendee = normalizeParticipant(attendee, false);
    if (normalizedAttendee.email === normalizedOrganizer?.email) {
      continue;
    }
    eventParticipants.push(normalizedAttendee);
  }

  return {
    event: {
      tracking_id_event: appleEvent.event_identifier,
      tracking_id_calendar: appleEvent.calendar.id,
      title: appleEvent.title,
      started_at: appleEvent.start_date,
      ended_at: appleEvent.end_date,
      location: appleEvent.location ?? undefined,
      meeting_link: meetingLink ?? undefined,
      description: appleEvent.notes ?? undefined,
      recurrence_series_id:
        appleEvent.recurrence?.series_identifier ?? undefined,
      has_recurrence_rules: appleEvent.has_recurrence_rules,
      is_all_day: appleEvent.is_all_day,
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

function normalizeParticipant(
  participant: Participant,
  isOrganizer: boolean,
): EventParticipant {
  return {
    name: participant.name ?? undefined,
    email: resolveParticipantEmail(participant),
    is_organizer: isOrganizer,
    is_current_user: participant.is_current_user,
  };
}

function resolveParticipantEmail(participant: Participant): string | undefined {
  if (participant.email) {
    return participant.email;
  }

  if (participant.contact?.email_addresses?.length) {
    return participant.contact.email_addresses[0];
  }

  if (participant.url) {
    const lower = participant.url.toLowerCase();
    if (lower.startsWith("mailto:")) {
      const email = participant.url.slice(7);
      if (email) {
        return email;
      }
    }
  }

  if (
    participant.name &&
    participant.name.includes("@") &&
    participant.name.includes(".") &&
    !participant.name.includes(" ")
  ) {
    return participant.name;
  }

  return undefined;
}
