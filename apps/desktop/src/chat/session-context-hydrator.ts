import { buildSegments, SegmentKey, type WordLike } from "~/stt/segment";
import {
  defaultRenderLabelContext,
  SpeakerLabelManager,
} from "~/stt/segment/shared";
import { convertStorageHintsToRuntime } from "~/stt/speaker-hints";
import type * as main from "~/store/tinybase/store/main";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type { SessionContentData } from "@hypr/plugin-fs-sync";
import type { SessionContext, Transcript } from "@hypr/plugin-template";
import type { SpeakerHintStorage } from "@hypr/store";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

function toMarkdownFromTiptap(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (!isValidTiptapContent(value)) {
    return null;
  }

  const md = json2md(value);
  const trimmed = md.trim();
  return trimmed ? trimmed : null;
}

function extractEventName(event: unknown): string | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const record = event as Record<string, unknown>;
  if (typeof record.name === "string" && record.name) {
    return record.name;
  }
  if (typeof record.title === "string" && record.title) {
    return record.title;
  }

  return null;
}

function buildTranscript(
  transcriptData: SessionContentData["transcript"],
  store: ReturnType<typeof main.UI.useStore>,
): Transcript | null {
  if (!transcriptData || transcriptData.transcripts.length === 0) {
    return null;
  }

  const indexedWords = transcriptData.transcripts
    .flatMap((transcript) =>
      transcript.words.map((word) => ({
        id: word.id ?? null,
        text: word.text,
        start_ms: word.startMs,
        end_ms: word.endMs,
        channel: word.channel as WordLike["channel"],
      })),
    )
    .sort((a, b) => a.start_ms - b.start_ms);

  const words: WordLike[] = indexedWords.map((word) => ({
    text: word.text,
    start_ms: word.start_ms,
    end_ms: word.end_ms,
    channel: word.channel,
  }));

  if (words.length === 0) {
    return null;
  }

  const wordIdToIndex = new Map<string, number>();
  indexedWords.forEach((word, index) => {
    if (typeof word.id === "string" && word.id) {
      wordIdToIndex.set(word.id, index);
    }
  });

  const storageHints: SpeakerHintStorage[] = transcriptData.transcripts.flatMap(
    (transcript) =>
      transcript.speakerHints.flatMap((hint) => {
        const start = wordIdToIndex.get(hint.startWordId);
        const end = wordIdToIndex.get(hint.endWordId);
        if (typeof start !== "number" || typeof end !== "number") {
          return [];
        }

        const from = Math.min(start, end);
        const to = Math.max(start, end);

        const speakerId = hint.speakerId;
        const speakerIndex =
          typeof speakerId === "string"
            ? Number.parseInt(speakerId.replace(/[^\d-]/g, ""), 10)
            : Number.NaN;

        const isHumanAssignment =
          !!store &&
          typeof speakerId === "string" &&
          Boolean(store.getRow("humans", speakerId));

        const type = isHumanAssignment
          ? "user_speaker_assignment"
          : "provider_speaker_index";
        const value = JSON.stringify(
          isHumanAssignment
            ? { human_id: speakerId }
            : {
                speaker_index: Number.isFinite(speakerIndex) ? speakerIndex : 0,
              },
        );

        return indexedWords.slice(from, to + 1).flatMap((word) => {
          if (typeof word.id !== "string" || !word.id) {
            return [];
          }
          return [
            {
              word_id: word.id,
              type,
              value,
            },
          ];
        });
      }),
  );

  const runtimeHints = convertStorageHintsToRuntime(
    storageHints,
    wordIdToIndex,
  );

  const segments = buildSegments(words, [], runtimeHints);
  const ctx = store ? defaultRenderLabelContext(store) : undefined;
  const manager = SpeakerLabelManager.fromSegments(segments, ctx);

  const startedAtCandidates = transcriptData.transcripts
    .map((t) => t.startedAt)
    .filter((v): v is number => typeof v === "number");
  const endedAtCandidates = transcriptData.transcripts
    .map((t) => t.endedAt)
    .filter((v): v is number => typeof v === "number");

  return {
    segments: segments.map((segment) => ({
      speaker: SegmentKey.renderLabel(segment.key, ctx, manager),
      text: segment.words.map((word) => word.text).join(" "),
    })),
    startedAt:
      startedAtCandidates.length > 0 ? Math.min(...startedAtCandidates) : null,
    endedAt:
      endedAtCandidates.length > 0 ? Math.max(...endedAtCandidates) : null,
  };
}

export async function hydrateSessionContextFromFs(
  store: ReturnType<typeof main.UI.useStore>,
  sessionId: string,
): Promise<SessionContext | null> {
  const result = await fsSyncCommands.loadSessionContent(sessionId);
  if (result.status === "error") {
    return null;
  }

  const payload = result.data;
  const participants =
    payload.meta?.participants
      ?.map((participant) => {
        const row = store?.getRow("humans", participant.humanId);
        if (!row || typeof row.name !== "string" || !row.name) {
          return null;
        }

        return {
          name: row.name,
          jobTitle:
            typeof row.job_title === "string" && row.job_title
              ? row.job_title
              : null,
        };
      })
      .filter(
        (
          participant,
        ): participant is { name: string; jobTitle: string | null } =>
          Boolean(participant),
      ) ?? [];

  const enhancedContent = payload.notes
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((note) => toMarkdownFromTiptap(note.tiptapJson))
    .filter((note): note is string => Boolean(note))
    .join("\n\n---\n\n");

  const transcript = buildTranscript(payload.transcript, store);
  const eventName = extractEventName(payload.meta?.event);

  return {
    title: payload.meta?.title ?? null,
    date: payload.meta?.createdAt ?? null,
    rawContent: toMarkdownFromTiptap(payload.rawMemoTiptapJson),
    enhancedContent: enhancedContent || null,
    transcript,
    participants,
    event: eventName ? { name: eventName } : null,
  };
}
