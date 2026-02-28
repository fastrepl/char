import type { Tables } from "tinybase/with-schemas";

import { md2json } from "@hypr/tiptap/shared";

import { type CuratedData, CuratedDataSchema } from "./schema";

import { DEFAULT_USER_ID, id } from "~/shared/utils";
import type { Schemas } from "~/store/tinybase/store/main";

export type { CuratedData };
export { CuratedDataSchema };

export const loadCuratedData = (data: CuratedData): Tables<Schemas[0]> => {
  const organizations: Tables<Schemas[0]>["organizations"] = {};
  const humans: Tables<Schemas[0]>["humans"] = {};
  const calendars: Tables<Schemas[0]>["calendars"] = {};
  const tags: Tables<Schemas[0]>["tags"] = {};
  const templates: Tables<Schemas[0]>["templates"] = {};
  const events: Tables<Schemas[0]>["events"] = {};
  const sessions: Tables<Schemas[0]>["sessions"] = {};
  const transcripts: Tables<Schemas[0]>["transcripts"] = {};
  const mapping_session_participant: Tables<
    Schemas[0]
  >["mapping_session_participant"] = {};
  const mapping_tag_session: Tables<Schemas[0]>["mapping_tag_session"] = {};
  const chat_groups: Tables<Schemas[0]>["chat_groups"] = {};
  const chat_messages: Tables<Schemas[0]>["chat_messages"] = {};
  const enhanced_notes: Tables<Schemas[0]>["enhanced_notes"] = {};
  const chat_shortcuts: Tables<Schemas[0]>["chat_shortcuts"] = {};

  const orgNameToId = new Map<string, string>();
  const tagNameToId = new Map<string, string>();
  const personNameToId = new Map<string, string>();
  const calendarNameToId = new Map<string, string>();
  const eventNameToId = new Map<string, string>();
  const sessionTitleToId = new Map<string, string>();
  const templateTitleToId = new Map<string, string>();

  data.organizations.forEach((org) => {
    const orgId = id();
    orgNameToId.set(org.name, orgId);
    organizations[orgId] = {
      user_id: DEFAULT_USER_ID,
      name: org.name,
    };
  });

  data.people.forEach((person) => {
    const personId = id();
    personNameToId.set(person.name, personId);
    const orgId = orgNameToId.get(person.organization);
    humans[personId] = {
      user_id: DEFAULT_USER_ID,
      name: person.name,
      email: person.email,
      job_title: person.job_title,
      linkedin_username: person.linkedin_username,
      org_id: orgId,
    };
  });

  data.calendars.forEach((cal) => {
    const calId = id();
    calendarNameToId.set(cal.name, calId);
    calendars[calId] = {
      user_id: DEFAULT_USER_ID,
      name: cal.name,
      created_at: new Date().toISOString(),
    };
  });

  data.tags.forEach((tag) => {
    const tagId = id();
    tagNameToId.set(tag.name, tagId);
    tags[tagId] = {
      user_id: DEFAULT_USER_ID,
      name: tag.name,
    };
  });

  data.templates.forEach((template) => {
    const templateId = id();
    templateTitleToId.set(template.title, templateId);
    templates[templateId] = {
      user_id: DEFAULT_USER_ID,
      title: template.title,
      description: template.description,
      sections: JSON.stringify(template.sections),
    };
  });

  data.events.forEach((event) => {
    const eventId = id();
    eventNameToId.set(event.name, eventId);
    const calendarId = calendarNameToId.get(event.calendar);
    events[eventId] = {
      user_id: DEFAULT_USER_ID,
      calendar_id: calendarId,
      title: event.name,
      started_at: event.started_at,
      ended_at: event.ended_at,
      location: event.location,
      meeting_link: event.meeting_link,
      description: event.description,
      note: event.note,
      created_at: new Date().toISOString(),
    };
  });

  data.sessions.forEach((session) => {
    const sessionId = id();
    sessionTitleToId.set(session.title, sessionId);
    let eventJson: string | undefined;
    if (session.event) {
      const eventId = eventNameToId.get(session.event);
      if (eventId) {
        const eventData = events[eventId];
        if (eventData) {
          eventJson = JSON.stringify({
            tracking_id: eventData.tracking_id_event ?? eventId,
            calendar_id: eventData.calendar_id ?? "",
            title: eventData.title ?? "",
            started_at: eventData.started_at ?? "",
            ended_at: eventData.ended_at ?? "",
            is_all_day: false,
            has_recurrence_rules: false,
          });
        }
      }
    }

    sessions[sessionId] = {
      user_id: DEFAULT_USER_ID,
      title: session.title,
      raw_md: JSON.stringify(md2json(session.raw_md)),
      created_at: new Date().toISOString(),
      event_json: eventJson,
      folder_id: session.folder ?? undefined,
    };

    session.participants.forEach((participantName) => {
      const participantId = personNameToId.get(participantName);
      if (participantId) {
        const mappingId = id();
        mapping_session_participant[mappingId] = {
          user_id: DEFAULT_USER_ID,
          session_id: sessionId,
          human_id: participantId,
        };
      }
    });

    session.tags.forEach((tagName) => {
      const tagId = tagNameToId.get(tagName);
      if (tagId) {
        const mappingId = id();
        mapping_tag_session[mappingId] = {
          user_id: DEFAULT_USER_ID,
          tag_id: tagId,
          session_id: sessionId,
        };
      }
    });

    if (session.transcript) {
      const transcriptId = id();
      const baseTimestamp = Date.now() - 3 * 60 * 60 * 1000;

      let maxEndMs = 0;
      const wordsList: Array<{
        id: string;
        text: string;
        start_ms: number;
        end_ms: number;
        channel: number;
      }> = [];

      session.transcript.segments.forEach((segment) => {
        segment.words.forEach(
          (word: { text: string; start_ms: number; end_ms: number }) => {
            if (word.end_ms > maxEndMs) {
              maxEndMs = word.end_ms;
            }

            wordsList.push({
              id: id(),
              text: word.text,
              start_ms: word.start_ms,
              end_ms: word.end_ms,
              channel: segment.channel,
            });
          },
        );
      });

      transcripts[transcriptId] = {
        user_id: DEFAULT_USER_ID,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        started_at: baseTimestamp,
        ended_at: maxEndMs > 0 ? baseTimestamp + maxEndMs : undefined,
        words: JSON.stringify(wordsList),
        speaker_hints: "[]",
        memo_md: "",
      };
    }
  });

  data.chat_groups.forEach((group) => {
    const groupId = id();
    chat_groups[groupId] = {
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
      title: group.title,
    };

    group.messages.forEach((msg) => {
      const msgId = id();
      chat_messages[msgId] = {
        user_id: DEFAULT_USER_ID,
        chat_group_id: groupId,
        role: msg.role,
        content: msg.content,
        created_at: new Date().toISOString(),
        metadata: JSON.stringify({}),
        parts: JSON.stringify([]),
      };
    });
  });

  data.enhanced_notes.forEach((note) => {
    const enhancedNoteId = id();
    const sessionId = sessionTitleToId.get(note.session);
    const templateId = note.template
      ? templateTitleToId.get(note.template)
      : undefined;

    if (sessionId) {
      enhanced_notes[enhancedNoteId] = {
        user_id: DEFAULT_USER_ID,
        session_id: sessionId,
        content: JSON.stringify(md2json(note.content)),
        position: note.position,
        template_id: templateId,
        title: note.title,
      };
    }
  });

  data.chat_shortcuts.forEach((shortcut) => {
    const shortcutId = id();
    chat_shortcuts[shortcutId] = {
      user_id: DEFAULT_USER_ID,
      content: shortcut.content,
    };
  });

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
