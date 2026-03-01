import type { AccountInfo } from "@hypr/plugin-auth";
import type { DeviceInfo } from "@hypr/plugin-misc";
import type { SessionContext } from "@hypr/plugin-template";

import type { HyprUIMessage } from "./types";
import { isRecord } from "./utils";

export const CURRENT_SESSION_CONTEXT_KEY = "session:current";

export type ContextEntitySource = "tool" | "manual" | "auto-current";

export type ContextRef = {
  kind: "session";
  key: string;
  source?: ContextEntitySource;
  sessionId: string;
};

export type ContextEntity =
  | (ContextRef & {
      sessionContext?: SessionContext;
      removable?: boolean;
    })
  | ({
      kind: "account";
      key: string;
      source?: ContextEntitySource;
    } & Partial<AccountInfo>)
  | ({
      kind: "device";
      key: string;
      source?: ContextEntitySource;
    } & Partial<DeviceInfo>);

export type ContextEntityKind = ContextEntity["kind"];

export function dedupeByKey<T extends { key: string }>(groups: T[][]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (!seen.has(item.key)) {
        seen.add(item.key);
        merged.push(item);
      }
    }
  }
  return merged;
}

type ToolOutputAvailablePart = {
  type: string;
  state: "output-available";
  output?: unknown;
};

function isToolOutputAvailablePart(
  value: unknown,
): value is ToolOutputAvailablePart {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    value.state === "output-available"
  );
}

function parseSearchSessionsOutput(output: unknown): ContextEntity[] {
  if (!isRecord(output) || !Array.isArray(output.results)) {
    return [];
  }

  return output.results.flatMap((item): ContextEntity[] => {
    if (!isRecord(item)) {
      return [];
    }

    if (typeof item.id !== "string" && typeof item.id !== "number") {
      return [];
    }

    const parsedSessionContext = parseSessionContext(item.sessionContext);
    const title = typeof item.title === "string" ? item.title : null;
    const content = typeof item.excerpt === "string" ? item.excerpt : null;

    return [
      {
        kind: "session",
        key: `session:search:${item.id}`,
        source: "tool",
        sessionId: String(item.id),
        sessionContext: parsedSessionContext ?? {
          title,
          date: null,
          rawContent: content,
          enhancedContent: null,
          transcript: null,
          participants: [],
          event: null,
        },
      },
    ];
  });
}

function parseSessionContext(value: unknown): SessionContext | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title : null;
  const date = typeof value.date === "string" ? value.date : null;
  const rawContent =
    typeof value.rawContent === "string" ? value.rawContent : null;
  const enhancedContent =
    typeof value.enhancedContent === "string" ? value.enhancedContent : null;

  const participants = Array.isArray(value.participants)
    ? value.participants.flatMap((participant) => {
        if (!isRecord(participant) || typeof participant.name !== "string") {
          return [];
        }
        return [
          {
            name: participant.name,
            jobTitle:
              typeof participant.jobTitle === "string"
                ? participant.jobTitle
                : null,
          },
        ];
      })
    : [];

  const event =
    isRecord(value.event) && typeof value.event.name === "string"
      ? { name: value.event.name }
      : null;

  const transcript = isRecord(value.transcript)
    ? {
        segments: Array.isArray(value.transcript.segments)
          ? value.transcript.segments.flatMap((segment) => {
              if (
                !isRecord(segment) ||
                typeof segment.speaker !== "string" ||
                typeof segment.text !== "string"
              ) {
                return [];
              }
              return [{ speaker: segment.speaker, text: segment.text }];
            })
          : [],
        startedAt:
          typeof value.transcript.startedAt === "number"
            ? value.transcript.startedAt
            : null,
        endedAt:
          typeof value.transcript.endedAt === "number"
            ? value.transcript.endedAt
            : null,
      }
    : null;

  return {
    title,
    date,
    rawContent,
    enhancedContent,
    transcript,
    participants,
    event,
  };
}

export type ToolContextExtractor = (output: unknown) => ContextEntity[];

const toolEntityExtractors: Record<string, ToolContextExtractor> = {
  search_sessions: parseSearchSessionsOutput,
};

export function registerToolContextExtractor(
  toolName: string,
  extractor: ToolContextExtractor,
): void {
  toolEntityExtractors[toolName] = extractor;
}

export function extractToolContextEntities(
  messages: Array<Pick<HyprUIMessage, "parts">>,
): ContextEntity[] {
  const seen = new Set<string>();
  const entities: ContextEntity[] = [];

  for (const message of messages) {
    if (!Array.isArray(message.parts)) continue;
    for (const part of message.parts) {
      if (!isToolOutputAvailablePart(part) || !part.type.startsWith("tool-")) {
        continue;
      }

      const toolName = part.type.slice(5);
      const extractor = toolEntityExtractors[toolName];
      if (!extractor) continue;

      for (const entity of extractor(part.output)) {
        if (!seen.has(entity.key)) {
          seen.add(entity.key);
          entities.push(entity);
        }
      }
    }
  }

  return entities;
}
