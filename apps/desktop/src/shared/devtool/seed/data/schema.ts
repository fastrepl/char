import { z } from "zod";

const CuratedOrganizationSchema = z.object({
  name: z.string(),
});

const CuratedPersonSchema = z.object({
  name: z.string(),
  email: z.email(),
  job_title: z.string(),
  linkedin_username: z.string().optional(),
  organization: z.string(),
});

const CuratedCalendarSchema = z.object({
  name: z.string(),
});

const CuratedFolderSchema = z.object({
  name: z.string(),
  parent: z.string().nullable(),
});

const CuratedTagSchema = z.object({
  name: z.string(),
});

const CuratedTemplateSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const CuratedTemplateSchema = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(CuratedTemplateSectionSchema),
});

const CuratedTranscriptWordSchema = z.object({
  text: z.string(),
  start_ms: z.number(),
  end_ms: z.number(),
});

const CuratedTranscriptSegmentSchema = z.object({
  channel: z.number(),
  start_ms: z.number(),
  end_ms: z.number(),
  text: z.string(),
  words: z.array(CuratedTranscriptWordSchema),
});

const CuratedTranscriptSchema = z.object({
  segments: z.array(CuratedTranscriptSegmentSchema),
});

const CuratedEventSchema = z.object({
  name: z.string(),
  calendar: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
  location: z.string().optional(),
  meeting_link: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
});

const CuratedSessionSchema = z.object({
  title: z.string(),
  raw_md: z.string(),
  folder: z.string().nullable(),
  event: z.string().nullable(),
  participants: z.array(z.string()),
  tags: z.array(z.string()),
  transcript: CuratedTranscriptSchema.optional(),
});

const CuratedChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const CuratedChatGroupSchema = z.object({
  title: z.string(),
  messages: z.array(CuratedChatMessageSchema),
});

const CuratedEnhancedNoteSchema = z.object({
  session: z.string(),
  content: z.string(),
  position: z.number(),
  template: z.string().nullable(),
  title: z.string().optional(),
});

const CuratedChatShortcutSchema = z.object({
  content: z.string(),
});

export const CuratedDataSchema = z.object({
  $schema: z.string().optional(),
  organizations: z.array(CuratedOrganizationSchema),
  people: z.array(CuratedPersonSchema),
  calendars: z.array(CuratedCalendarSchema),
  folders: z.array(CuratedFolderSchema),
  tags: z.array(CuratedTagSchema),
  templates: z.array(CuratedTemplateSchema),
  events: z.array(CuratedEventSchema),
  sessions: z.array(CuratedSessionSchema),
  chat_groups: z.array(CuratedChatGroupSchema),
  enhanced_notes: z.array(CuratedEnhancedNoteSchema),
  chat_shortcuts: z.array(CuratedChatShortcutSchema),
});

export type CuratedData = z.infer<typeof CuratedDataSchema>;
