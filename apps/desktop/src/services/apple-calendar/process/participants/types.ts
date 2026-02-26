import type { IncomingParticipants } from "~/services/apple-calendar/fetch/types";

export type ParticipantMappingId = string;

export type ParticipantsSyncInput = {
  incomingParticipants: IncomingParticipants;
  timezone?: string;
};

export type ParticipantMappingToAdd = {
  sessionId: string;
  humanId: string;
};

export type HumanToCreate = {
  id: string;
  name: string;
  email: string;
};

export type ParticipantsSyncOutput = {
  toDelete: ParticipantMappingId[];
  toAdd: ParticipantMappingToAdd[];
  humansToCreate: HumanToCreate[];
};
