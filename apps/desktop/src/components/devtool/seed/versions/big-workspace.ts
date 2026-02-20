import { faker } from "@faker-js/faker/locale/en";

import type { AppleCalendar } from "@hypr/plugin-apple-calendar";

import type { Store as MainStore } from "../../../../store/tinybase/store/main";
import type { SeedDefinition } from "../shared";
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
  buildSessionTags,
  buildTags,
  buildTemplates,
} from "../shared";
import {
  buildLongTranscriptsForSessions,
  buildSessionsForBigWorkspace,
} from "./big-workspace-builders";

const buildBigWorkspaceData = (fixtureCalendars?: AppleCalendar[]) => {
  faker.seed(456);

  const organizations = buildOrganizations(8);
  const orgIds = Object.keys(organizations);

  const humans = buildHumans(orgIds, {
    includeCurrentUser: true,
    countPerOrg: { min: 3, max: 8 },
  });
  const humanIds = Object.keys(humans);

  const calendars = buildCalendars(5, fixtureCalendars);
  const calendarIds = Object.keys(calendars);

  const { events } = buildEventsByHuman(humanIds, calendarIds, {
    min: 2,
    max: 6,
  });

  const tags = buildTags(15);
  const tagIds = Object.keys(tags);

  const templates = buildTemplates(10);
  const templateIds = Object.keys(templates);

  const sessions = buildSessionsForBigWorkspace(150, {
    events,
    eventLinkProbability: 0.7,
  });
  const sessionIds = Object.keys(sessions);

  const { transcripts } = buildLongTranscriptsForSessions(sessionIds, {
    turnCount: { min: 1500, max: 2000 },
    days: 90,
  });

  const mapping_session_participant = buildSessionParticipants(
    sessionIds,
    humanIds,
    {
      min: 2,
      max: 6,
    },
  );

  const mapping_tag_session = buildSessionTags(sessionIds, tagIds, {
    tagProbability: 0.8,
    tagsPerSession: { min: 1, max: 4 },
  });

  const chat_groups = buildChatGroups(10);
  const chatGroupIds = Object.keys(chat_groups);

  const chat_messages = buildChatMessages(chatGroupIds, { min: 5, max: 15 });

  const enhanced_notes = buildEnhancedNotesForSessions(
    sessionIds,
    templateIds,
    {
      notesPerSession: { min: 1, max: 4 },
      templateProbability: 0.5,
    },
  );

  const chat_shortcuts = buildChatShortcuts(8);

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

export const bigWorkspaceSeed: SeedDefinition = {
  id: "big-workspace",
  label: "Big Workspace",
  calendarFixtureBase: "default",
  run: async (store: MainStore, fixtureCalendars?: AppleCalendar[]) => {
    const data = buildBigWorkspaceData(fixtureCalendars);
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.setTables(data as any);
    });
  },
};
