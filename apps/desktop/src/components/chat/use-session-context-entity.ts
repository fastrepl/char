import { useMemo } from "react";

import {
  type Participant,
  type SessionContext,
  type Transcript,
} from "@hypr/plugin-template";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

import {
  type ContextEntity,
  CURRENT_SESSION_CONTEXT_KEY,
} from "../../chat/context-item";
import { useSession } from "../../hooks/tinybase";
import * as main from "../../store/tinybase/store/main";
import { buildSegments, SegmentKey, type WordLike } from "../../utils/segment";
import {
  defaultRenderLabelContext,
  SpeakerLabelManager,
} from "../../utils/segment/shared";

function tiptapJsonToMarkdown(
  tiptapJson: string | undefined,
): string | undefined {
  if (typeof tiptapJson !== "string" || !tiptapJson.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(tiptapJson);
    if (!isValidTiptapContent(parsed)) {
      return undefined;
    }
    const md = json2md(parsed);
    return md.trim() || undefined;
  } catch {
    return undefined;
  }
}

function useSessionTranscript(sessionId: string): {
  transcript: Transcript | null;
  wordCount: number;
} {
  const store = main.UI.useStore(main.STORE_ID);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const wordsJson = main.UI.useCell(
    "transcripts",
    transcriptIds?.[0] ?? "",
    "words",
    main.STORE_ID,
  ) as string | undefined;

  const words = useMemo((): WordLike[] => {
    if (!wordsJson) {
      return [];
    }

    try {
      const parsed = JSON.parse(wordsJson) as Array<{
        text: string;
        start_ms: number;
        end_ms: number;
        channel: number;
      }>;

      return parsed
        .map((w) => ({
          text: w.text,
          start_ms: w.start_ms,
          end_ms: w.end_ms,
          channel: w.channel as WordLike["channel"],
        }))
        .sort((a, b) => a.start_ms - b.start_ms);
    } catch {
      return [];
    }
  }, [wordsJson]);

  const transcript = useMemo((): Transcript | null => {
    if (words.length === 0 || !store) {
      return null;
    }

    const segments = buildSegments(words, [], []);
    const ctx = defaultRenderLabelContext(store);
    const manager = SpeakerLabelManager.fromSegments(segments, ctx);

    return {
      segments: segments.map((seg) => ({
        speaker: SegmentKey.renderLabel(seg.key, ctx, manager),
        text: seg.words.map((w) => w.text).join(" "),
      })),
      startedAt: null,
      endedAt: null,
    };
  }, [words, store]);

  return { transcript, wordCount: words.length };
}

function useSessionParticipants(sessionId: string): Participant[] {
  const store = main.UI.useStore(main.STORE_ID);

  const participantIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId,
    main.STORE_ID,
  );

  return useMemo((): Participant[] => {
    if (!store || participantIds.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: Participant[] = [];

    for (const mappingId of participantIds) {
      const humanId = store.getCell(
        "mapping_session_participant",
        mappingId,
        "human_id",
      ) as string | undefined;
      if (!humanId || seen.has(humanId)) {
        continue;
      }

      seen.add(humanId);
      const name = store.getCell("humans", humanId, "name") as
        | string
        | undefined;
      if (!name) {
        continue;
      }

      const jobTitle = store.getCell("humans", humanId, "job_title") as
        | string
        | undefined;

      result.push({
        name,
        jobTitle: jobTitle || null,
      });
    }

    return result;
  }, [store, participantIds]);
}

function useSessionEnhancedContent(sessionId: string): string | undefined {
  const store = main.UI.useStore(main.STORE_ID);

  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );

  return useMemo((): string | undefined => {
    if (!store || !enhancedNoteIds || enhancedNoteIds.length === 0) {
      return undefined;
    }

    const parts: string[] = [];
    for (const noteId of enhancedNoteIds) {
      const content = store.getCell("enhanced_notes", noteId, "content") as
        | string
        | undefined;
      const md = tiptapJsonToMarkdown(content);
      if (md) {
        parts.push(md);
      }
    }

    return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
  }, [store, enhancedNoteIds]);
}

export function useSessionContextEntity(
  currentSessionId?: string,
): Extract<ContextEntity, { kind: "session" }> | null {
  const sessionId = currentSessionId ?? "";
  const { title, rawMd, createdAt, event } = useSession(sessionId);

  const { transcript, wordCount } = useSessionTranscript(sessionId);
  const participants = useSessionParticipants(sessionId);
  const enhancedContent = useSessionEnhancedContent(sessionId);

  const rawContentMd = useMemo(
    () => tiptapJsonToMarkdown(rawMd as string | undefined),
    [rawMd],
  );

  return useMemo((): Extract<ContextEntity, { kind: "session" }> | null => {
    if (!currentSessionId) {
      return null;
    }

    const titleStr = (title as string) || undefined;
    const dateStr = (createdAt as string) || undefined;

    const isEmpty =
      !titleStr &&
      !dateStr &&
      wordCount === 0 &&
      !rawContentMd &&
      !enhancedContent &&
      participants.length === 0 &&
      !event?.title;

    if (isEmpty) {
      return null;
    }

    const sc: SessionContext = {
      title: titleStr ?? null,
      date: dateStr ?? null,
      rawContent: rawContentMd ?? null,
      enhancedContent: enhancedContent ?? null,
      transcript,
      participants,
      event: event?.title ? { name: event.title } : null,
    };

    return {
      kind: "session",
      key: CURRENT_SESSION_CONTEXT_KEY,
      sessionContext: sc,
    };
  }, [
    currentSessionId,
    title,
    createdAt,
    rawContentMd,
    enhancedContent,
    wordCount,
    participants,
    event,
    transcript,
  ]);
}
