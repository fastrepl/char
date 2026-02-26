import type {
  ExistingEvent,
  IncomingEvent,
  IncomingParticipants,
} from "~/services/apple-calendar/fetch/types";

import type { EventParticipant } from "@hypr/store";

export type EventId = string;

export type EventsSyncInput = {
  incoming: IncomingEvent[];
  existing: ExistingEvent[];
  incomingParticipants: IncomingParticipants;
  timezone?: string;
};

export type EventToAdd = IncomingEvent & {
  participants: EventParticipant[];
};

export type EventToUpdate = ExistingEvent &
  Omit<IncomingEvent, "tracking_id_calendar"> & {
    participants: EventParticipant[];
  };

export type EventsSyncOutput = {
  toDelete: EventId[];
  toUpdate: EventToUpdate[];
  toAdd: EventToAdd[];
};
