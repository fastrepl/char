import type { AppleCalendar } from "@hypr/plugin-apple-calendar";

import type { Store as MainStore } from "~/store/tinybase/store/main";

export * from "./builders";
export { createCalendar, createCalendarFromFixture } from "./calendar";
export { createChatGroup, createChatMessage } from "./chat";
export { createChatShortcut } from "./chat-shortcut";
export { createEnhancedNote } from "./enhanced-note";
export { createEvent } from "./event";
export { createHuman } from "./human";
export * from "./loader";
export {
  createMappingSessionParticipant,
  createMappingTagSession,
} from "./mapping";
export { createOrganization } from "./organization";
export { createSession, generateEnhancedMarkdown } from "./session";
export { createTag } from "./tag";
export { createTemplate } from "./template";
export { generateTranscript } from "./transcript";

export type CalendarFixtureBase = "default";

export type SeedDefinition = {
  id: string;
  label: string;
  run: (
    store: MainStore,
    fixtureCalendars?: AppleCalendar[],
  ) => void | Promise<void>;
  calendarFixtureBase?: CalendarFixtureBase;
};
