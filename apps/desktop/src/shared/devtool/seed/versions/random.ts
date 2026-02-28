import { faker } from "@faker-js/faker/locale/en";

import type { AppleCalendar } from "@hypr/plugin-apple-calendar";

import type { SeedDefinition } from "~/shared/devtool/seed/shared";
import {
  buildCalendars,
  buildChatGroups,
  buildChatMessages,
  buildChatShortcuts,
  buildEnhancedNotesForSessions,
  buildEventsByHuman,
  buildHumans,
  buildOrganizations,
  buildSessionParticipants,
  buildSessionsPerHuman,
  buildSessionTags,
  buildTags,
  buildTemplates,
  buildTranscriptsForSessions,
} from "~/shared/devtool/seed/shared";
import type { Store as MainStore } from "~/store/tinybase/store/main";

const buildRandomData = (fixtureCalendars?: AppleCalendar[]) => {
  faker.seed(123);

  const organizations = buildOrganizations(4);
  const orgIds = Object.keys(organizations);

  const humans = buildHumans(orgIds, {
    includeCurrentUser: true,
    countPerOrg: { min: 2, max: 5 },
  });
  const humanIds = Object.keys(humans);

  const calendars = buildCalendars(3, fixtureCalendars);
  const calendarIds = Object.keys(calendars);

  const { events, eventsByHuman } = buildEventsByHuman(humanIds, calendarIds, {
    min: 1,
    max: 3,
  });

  const tags = buildTags(8);
  const tagIds = Object.keys(tags);

  const templates = buildTemplates(5);
  const templateIds = Object.keys(templates);

  const sessions = buildSessionsPerHuman(
    humanIds,
    { min: 1, max: 3 },
    {
      events,
      eventsByHuman,
      eventLinkProbability: 0.6,
    },
  );
  const sessionIds = Object.keys(sessions);

  const { transcripts } = buildTranscriptsForSessions(sessionIds, {
    turnCount: { min: 20, max: 50 },
  });

  const mapping_session_participant = buildSessionParticipants(
    sessionIds,
    humanIds,
    {
      min: 1,
      max: 3,
    },
  );

  const mapping_tag_session = buildSessionTags(sessionIds, tagIds, {
    tagProbability: 0.6,
    tagsPerSession: { min: 1, max: 3 },
  });

  const chat_groups = buildChatGroups(5);
  const chatGroupIds = Object.keys(chat_groups);

  const chat_messages = buildChatMessages(chatGroupIds, { min: 2, max: 5 });

  const enhanced_notes = buildEnhancedNotesForSessions(
    sessionIds,
    templateIds,
    {
      notesPerSession: { min: 0, max: 3 },
      templateProbability: 0.3,
    },
  );

  const chat_shortcuts = buildChatShortcuts(5);

  return {
    organizations,
    humans,
    calendars,
    sessions,
    transcripts,
    events,
    mapping_session_participant,
    tags,
    mapping_tag_session,
    templates,
    chat_groups,
    chat_messages,
    enhanced_notes,
    chat_shortcuts,
  };
};

export const randomSeed: SeedDefinition = {
  id: "random",
  label: "Random",
  calendarFixtureBase: "default",
  run: async (store: MainStore, fixtureCalendars?: AppleCalendar[]) => {
    const data = buildRandomData(fixtureCalendars);
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.setTables(data as any);
    });
  },
};
