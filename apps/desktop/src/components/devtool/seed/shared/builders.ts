import { faker } from "@faker-js/faker/locale/en";

import type { AppleCalendar } from "@hypr/plugin-apple-calendar";
import type {
  Calendar,
  ChatGroup,
  ChatMessageStorage,
  ChatShortcutStorage,
  EnhancedNoteStorage,
  EventStorage,
  Human,
  MappingSessionParticipant,
  MappingTagSession,
  Organization,
  SessionEvent,
  SessionStorage,
  Tag,
  TemplateStorage,
  TranscriptStorage,
} from "@hypr/store";

import { createCalendar, createCalendarFromFixture } from "./calendar";
import { createChatGroup, createChatMessage } from "./chat";
import { createChatShortcut } from "./chat-shortcut";
import { createEnhancedNote } from "./enhanced-note";
import { createEvent } from "./event";
import { createHuman } from "./human";
import {
  createMappingSessionParticipant,
  createMappingTagSession,
} from "./mapping";
import { createOrganization } from "./organization";
import { createSession } from "./session";
import { createTag } from "./tag";
import { createTemplate } from "./template";
import { generateTranscript } from "./transcript";

export const buildOrganizations = (
  count: number,
): Record<string, Organization> => {
  const organizations: Record<string, Organization> = {};

  for (let i = 0; i < count; i++) {
    const org = createOrganization();
    organizations[org.id] = org.data;
  }

  return organizations;
};

export const buildCalendars = (
  count: number,
  fixtureCalendars?: AppleCalendar[],
): Record<string, Calendar> => {
  if (fixtureCalendars?.length) {
    const calendars: Record<string, Calendar> = {};
    for (const fc of fixtureCalendars) {
      const cal = createCalendarFromFixture(fc);
      calendars[cal.id] = cal.data;
    }
    return calendars;
  }

  const calendars: Record<string, Calendar> = {};
  for (let i = 0; i < count; i++) {
    const calendar = createCalendar();
    calendars[calendar.id] = calendar.data;
  }

  return calendars;
};

export const buildHumans = (
  orgIds: string[],
  options: {
    includeCurrentUser?: boolean;
    countPerOrg: { min: number; max: number };
  } = {
    includeCurrentUser: true,
    countPerOrg: { min: 2, max: 5 },
  },
): Record<string, Human> => {
  const humans: Record<string, Human> = {};

  if (options.includeCurrentUser && orgIds.length > 0) {
    const currentUser = createHuman(orgIds[0]);
    humans[currentUser.id] = currentUser.data;
  }

  orgIds.forEach((orgId) => {
    const humanCount = faker.number.int(options.countPerOrg);

    for (let i = 0; i < humanCount; i++) {
      const human = createHuman(orgId);
      humans[human.id] = human.data;
    }
  });

  return humans;
};

export const buildEvents = (
  calendarIds: string[],
  count: { min: number; max: number },
): Record<string, EventStorage> => {
  const events: Record<string, EventStorage> = {};
  const eventCount = faker.number.int(count);

  for (let i = 0; i < eventCount; i++) {
    const calendar_id = faker.helpers.arrayElement(calendarIds);
    const event = createEvent(calendar_id);
    events[event.id] = event.data;
  }

  return events;
};

export const buildEventsByHuman = (
  humanIds: string[],
  calendarIds: string[],
  countPerHuman: { min: number; max: number },
): {
  events: Record<string, EventStorage>;
  eventsByHuman: Record<string, string[]>;
} => {
  const events: Record<string, EventStorage> = {};
  const eventsByHuman: Record<string, string[]> = {};

  humanIds.forEach((humanId) => {
    const eventCount = faker.number.int(countPerHuman);
    eventsByHuman[humanId] = [];

    for (let i = 0; i < eventCount; i++) {
      const calendar_id = faker.helpers.arrayElement(calendarIds);
      const event = createEvent(calendar_id);
      events[event.id] = event.data;
      eventsByHuman[humanId].push(event.id);
    }
  });

  return { events, eventsByHuman };
};

export const buildTags = (count: number): Record<string, Tag> => {
  const tags: Record<string, Tag> = {};

  for (let i = 0; i < count; i++) {
    const tag = createTag();
    tags[tag.id] = tag.data;
  }

  return tags;
};

export const buildTemplates = (
  count: number,
): Record<string, TemplateStorage> => {
  const templates: Record<string, TemplateStorage> = {};

  for (let i = 0; i < count; i++) {
    const template = createTemplate();
    templates[template.id] = template.data;
  }

  return templates;
};

export const toSessionEvent = ([eventId, event]: [
  string,
  EventStorage,
]): SessionEvent => ({
  tracking_id: event.tracking_id_event ?? `mock-${eventId}`,
  calendar_id: event.calendar_id ?? "",
  title: event.title ?? "",
  started_at: event.started_at ?? "",
  ended_at: event.ended_at ?? "",
  is_all_day: event.is_all_day ?? false,
  has_recurrence_rules: event.has_recurrence_rules ?? false,
  location: event.location,
  meeting_link: event.meeting_link,
  description: event.description,
  recurrence_series_id: event.recurrence_series_id,
});

export const buildSessions = (
  count: number,
  options: {
    events?: Record<string, EventStorage>;
    eventLinkProbability?: number;
  } = {},
): Record<string, SessionStorage> => {
  const sessions: Record<string, SessionStorage> = {};
  const { events = {}, eventLinkProbability = 0.6 } = options;
  const eventEntries = Object.entries(events);

  for (let i = 0; i < count; i++) {
    const shouldLinkToEvent =
      eventEntries.length > 0 &&
      faker.datatype.boolean({ probability: eventLinkProbability });

    const sessionEvent = shouldLinkToEvent
      ? toSessionEvent(faker.helpers.arrayElement(eventEntries))
      : undefined;

    const session = createSession(sessionEvent, undefined);
    sessions[session.id] = session.data;
  }

  return sessions;
};

export const buildSessionsPerHuman = (
  humanIds: string[],
  sessionsPerHuman: { min: number; max: number },
  options: {
    events?: Record<string, EventStorage>;
    eventsByHuman?: Record<string, string[]>;
    eventLinkProbability?: number;
  } = {},
): Record<string, SessionStorage> => {
  const sessions: Record<string, SessionStorage> = {};
  const {
    events = {},
    eventsByHuman = {},
    eventLinkProbability = 0.6,
  } = options;

  humanIds.forEach((humanId) => {
    const sessionCount = faker.number.int(sessionsPerHuman);
    const humanEventIds = eventsByHuman[humanId] || [];

    for (let i = 0; i < sessionCount; i++) {
      const shouldLinkToEvent =
        humanEventIds.length > 0 &&
        faker.datatype.boolean({ probability: eventLinkProbability });

      const eventId = shouldLinkToEvent
        ? faker.helpers.arrayElement(humanEventIds)
        : undefined;

      const sessionEvent =
        eventId && events[eventId]
          ? toSessionEvent([eventId, events[eventId]])
          : undefined;

      const session = createSession(sessionEvent, undefined);
      sessions[session.id] = session.data;
    }
  });

  return sessions;
};

export const buildTranscriptsForSessions = (
  sessionIds: string[],
  options: {
    turnCount?: { min: number; max: number };
  } = {},
): {
  transcripts: Record<string, TranscriptStorage>;
} => {
  const transcripts: Record<string, TranscriptStorage> = {};

  sessionIds.forEach((sessionId) => {
    const result = generateTranscript({
      sessionId,
      turnCount: options.turnCount,
    });

    if (!("transcript" in result)) {
      throw new Error("Expected transcript metadata");
    }

    const { transcriptId, transcript } = result;
    transcripts[transcriptId] = transcript;
  });

  return { transcripts };
};

export const buildSessionParticipants = (
  sessionIds: string[],
  humanIds: string[],
  participantsPerSession: { min: number; max: number },
): Record<string, MappingSessionParticipant> => {
  const mapping_session_participant: Record<string, MappingSessionParticipant> =
    {};

  sessionIds.forEach((sessionId) => {
    const participantCount = faker.number.int(participantsPerSession);
    const selectedHumans = faker.helpers.arrayElements(
      humanIds,
      participantCount,
    );

    selectedHumans.forEach((humanId) => {
      const mapping = createMappingSessionParticipant(sessionId, humanId);
      mapping_session_participant[mapping.id] = mapping.data;
    });
  });

  return mapping_session_participant;
};

export const buildSessionTags = (
  sessionIds: string[],
  tagIds: string[],
  options: {
    tagProbability?: number;
    tagsPerSession?: { min: number; max: number };
  } = {},
): Record<string, MappingTagSession> => {
  const mapping_tag_session: Record<string, MappingTagSession> = {};
  const { tagProbability = 0.6, tagsPerSession = { min: 1, max: 3 } } = options;

  sessionIds.forEach((sessionId) => {
    const shouldTag = faker.datatype.boolean({
      probability: tagProbability,
    });
    if (shouldTag) {
      const tagCount = faker.number.int(tagsPerSession);
      const selectedTags = faker.helpers.arrayElements(tagIds, tagCount);
      selectedTags.forEach((tagId) => {
        const mapping = createMappingTagSession(tagId, sessionId);
        mapping_tag_session[mapping.id] = mapping.data;
      });
    }
  });

  return mapping_tag_session;
};

export const buildChatGroups = (count: number): Record<string, ChatGroup> => {
  const chat_groups: Record<string, ChatGroup> = {};

  for (let i = 0; i < count; i++) {
    const group = createChatGroup();
    chat_groups[group.id] = group.data;
  }

  return chat_groups;
};

export const buildChatMessages = (
  groupIds: string[],
  messagesPerGroup: { min: number; max: number },
): Record<string, ChatMessageStorage> => {
  const chat_messages: Record<string, ChatMessageStorage> = {};

  groupIds.forEach((groupId) => {
    const messageCount = faker.number.int(messagesPerGroup);
    for (let i = 0; i < messageCount; i++) {
      const role = i % 2 === 0 ? "user" : "assistant";
      const message = createChatMessage(groupId, role);
      chat_messages[message.id] = message.data;
    }
  });

  return chat_messages;
};

export const buildEnhancedNotesForSessions = (
  sessionIds: string[],
  templateIds: string[],
  options: {
    notesPerSession?: { min: number; max: number };
    templateProbability?: number;
  } = {},
): Record<string, EnhancedNoteStorage> => {
  const enhanced_notes: Record<string, EnhancedNoteStorage> = {};
  const { notesPerSession = { min: 0, max: 3 }, templateProbability = 0.3 } =
    options;

  sessionIds.forEach((sessionId) => {
    const noteCount = faker.number.int(notesPerSession);
    for (let i = 0; i < noteCount; i++) {
      const shouldUseTemplate =
        templateIds.length > 0 &&
        faker.datatype.boolean({ probability: templateProbability });
      const templateId = shouldUseTemplate
        ? faker.helpers.arrayElement(templateIds)
        : undefined;
      const note = createEnhancedNote(sessionId, i, templateId);
      enhanced_notes[note.id] = note.data;
    }
  });

  return enhanced_notes;
};

export const buildChatShortcuts = (
  count: number,
): Record<string, ChatShortcutStorage> => {
  const chat_shortcuts: Record<string, ChatShortcutStorage> = {};

  for (let i = 0; i < count; i++) {
    const shortcut = createChatShortcut();
    chat_shortcuts[shortcut.id] = shortcut.data;
  }

  return chat_shortcuts;
};
