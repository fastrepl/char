import type { ExistingEvent, IncomingEvent } from "../../fetch/types";

export type EventId = string;

export type EventsSyncInput = {
  incoming: IncomingEvent[];
  existing: ExistingEvent[];
};

export type EventToUpdate = ExistingEvent &
  Omit<IncomingEvent, "tracking_id_calendar">;

export type EventsSyncOutput = {
  toDelete: EventId[];
  toUpdate: EventToUpdate[];
  toAdd: IncomingEvent[];
};
