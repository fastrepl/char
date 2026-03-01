import { faker } from "@faker-js/faker/locale/en";
import type { Tables } from "tinybase/with-schemas";

import type { SeedDefinition } from "~/shared/devtool/seed/shared";
import {
  createHuman,
  createOrganization,
  createSession,
  generateTranscript,
} from "~/shared/devtool/seed/shared";
import type { Schemas } from "~/store/tinybase/store/main";
import type { Store as MainStore } from "~/store/tinybase/store/main";

const buildLongData = (): Tables<Schemas[0]> => {
  faker.seed(789);

  const organization = createOrganization();
  const human = createHuman(organization.id);
  const session = createSession();

  const result = generateTranscript({
    turnCount: { min: 300, max: 300 },
    days: 7,
    sessionId: session.id,
  });

  if (!("transcript" in result)) {
    throw new Error("Expected transcript metadata");
  }

  const { transcriptId, transcript } = result;

  const transcripts: Tables<Schemas[0]>["transcripts"] = {
    [transcriptId]: {
      user_id: transcript.user_id ?? "",
      created_at: transcript.created_at ?? "",
      session_id: transcript.session_id ?? "",
      started_at: transcript.started_at ?? 0,
      ended_at:
        typeof transcript.ended_at === "number"
          ? transcript.ended_at
          : undefined,
      words: transcript.words ?? "[]",
      speaker_hints: transcript.speaker_hints ?? "[]",
    },
  };

  return {
    organizations: { [organization.id]: organization.data },
    humans: { [human.id]: human.data },
    sessions: {
      [session.id]: {
        user_id: session.data.user_id ?? "",
        created_at: session.data.created_at ?? "",
        title: session.data.title ?? "",
        raw_md: session.data.raw_md ?? "",
        event_json: session.data.event_json,
        folder_id: session.data.folder_id,
      },
    },
    transcripts,
  };
};

export const longSeed: SeedDefinition = {
  id: "long",
  label: "Long",
  calendarFixtureBase: "default",
  run: async (store: MainStore, _fixtureCalendars) => {
    const data = buildLongData();
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
      store.setTables(data);
    });
  },
};
