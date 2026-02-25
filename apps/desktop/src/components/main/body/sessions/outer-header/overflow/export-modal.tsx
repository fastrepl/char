import { useMutation } from "@tanstack/react-query";
import { downloadDir, join } from "@tauri-apps/api/path";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  commands as pdfCommands,
  type PdfMetadata,
  type TranscriptItem,
} from "@hypr/plugin-pdf";
import { json2md } from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";
import { Label } from "@hypr/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

import { useSessionEvent } from "../../../../../../hooks/tinybase";
import * as main from "../../../../../../store/tinybase/store/main";
import {
  parseTranscriptHints,
  parseTranscriptWords,
} from "../../../../../../store/transcript/utils";
import type { EditorView } from "../../../../../../store/zustand/tabs/schema";
import { buildSegments, SegmentKey } from "../../../../../../utils/segment";
import {
  defaultRenderLabelContext,
  SpeakerLabelManager,
} from "../../../../../../utils/segment/shared";
import { convertStorageHintsToRuntime } from "../../../../../../utils/speaker-hints";

type FileFormat = "pdf" | "txt" | "md";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(startMs: number, endMs: number): string {
  const durationMs = endMs - startMs;
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

export function ExportModal({
  sessionId,
  currentView,
}: {
  sessionId: string;
  currentView: EditorView;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<FileFormat>("pdf");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeMemos, setIncludeMemos] = useState(false);
  const [includeTranscript, setIncludeTranscript] = useState(false);

  const store = main.UI.useStore(main.STORE_ID);
  const queries = main.UI.useQueries(main.STORE_ID);

  const sessionTitle = main.UI.useCell(
    "sessions",
    sessionId,
    "title",
    main.STORE_ID,
  ) as string | undefined;

  const sessionCreatedAt = main.UI.useCell(
    "sessions",
    sessionId,
    "created_at",
    main.STORE_ID,
  ) as string | undefined;

  const event = useSessionEvent(sessionId);
  const eventTitle = event?.title;

  const rawMd = main.UI.useCell(
    "sessions",
    sessionId,
    "raw_md",
    main.STORE_ID,
  ) as string | undefined;

  const enhancedNoteId = currentView.type === "enhanced" ? currentView.id : "";
  const enhancedNoteContent = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "content",
    main.STORE_ID,
  ) as string | undefined;

  const participantNames = useMemo((): string[] => {
    if (!queries) return [];

    const names: string[] = [];
    queries.forEachResultRow(
      main.QUERIES.sessionParticipantsWithDetails,
      (rowId) => {
        const participantSessionId = queries.getResultCell(
          main.QUERIES.sessionParticipantsWithDetails,
          rowId,
          "session_id",
        );
        if (participantSessionId === sessionId) {
          const name = queries.getResultCell(
            main.QUERIES.sessionParticipantsWithDetails,
            rowId,
            "human_name",
          );
          if (name && typeof name === "string") {
            names.push(name);
          }
        }
      },
    );
    return names;
  }, [queries, sessionId]);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const transcriptItems = useMemo((): TranscriptItem[] => {
    if (!store || !transcriptIds || transcriptIds.length === 0) {
      return [];
    }

    const wordIdToIndex = new Map<string, number>();
    const collectedWords: Array<{
      id: string;
      text: string;
      start_ms: number;
      end_ms: number;
      channel: number;
    }> = [];

    const firstStartedAt = store.getCell(
      "transcripts",
      transcriptIds[0],
      "started_at",
    );

    for (const transcriptId of transcriptIds) {
      const startedAt = store.getCell(
        "transcripts",
        transcriptId,
        "started_at",
      );
      const offset =
        typeof startedAt === "number" && typeof firstStartedAt === "number"
          ? startedAt - firstStartedAt
          : 0;

      const words = parseTranscriptWords(store, transcriptId);
      for (const word of words) {
        if (word.text === undefined || word.start_ms === undefined) continue;
        collectedWords.push({
          id: word.id,
          text: word.text,
          start_ms: word.start_ms + offset,
          end_ms: (word.end_ms ?? word.start_ms) + offset,
          channel: word.channel ?? 0,
        });
      }
    }

    collectedWords.sort((a, b) => a.start_ms - b.start_ms);
    collectedWords.forEach((w, i) => wordIdToIndex.set(w.id, i));

    const storageHints = transcriptIds.flatMap((id) =>
      parseTranscriptHints(store, id),
    );
    const speakerHints = convertStorageHintsToRuntime(
      storageHints,
      wordIdToIndex,
    );

    const segments = buildSegments(collectedWords, [], speakerHints);
    const ctx = defaultRenderLabelContext(store);
    const manager = SpeakerLabelManager.fromSegments(segments, ctx);

    return segments.map((segment) => ({
      speaker: SegmentKey.renderLabel(segment.key, ctx, manager),
      text: segment.words.map((w) => w.text).join(" "),
    }));
  }, [store, transcriptIds]);

  const transcriptDuration = useMemo((): string | null => {
    if (!store || !transcriptIds || transcriptIds.length === 0) {
      return null;
    }

    let minStartedAt: number | null = null;
    let maxEndedAt: number | null = null;

    for (const transcriptId of transcriptIds) {
      const startedAt = store.getCell(
        "transcripts",
        transcriptId,
        "started_at",
      );
      const endedAt = store.getCell("transcripts", transcriptId, "ended_at");

      if (typeof startedAt === "number") {
        if (minStartedAt === null || startedAt < minStartedAt) {
          minStartedAt = startedAt;
        }
      }
      if (typeof endedAt === "number") {
        if (maxEndedAt === null || endedAt > maxEndedAt) {
          maxEndedAt = endedAt;
        }
      }
    }

    if (minStartedAt !== null && maxEndedAt !== null) {
      return formatDuration(minStartedAt, maxEndedAt);
    }
    return null;
  }, [store, transcriptIds]);

  const getSummaryMd = (): string => {
    if (!enhancedNoteContent) return "";
    try {
      const parsed = JSON.parse(enhancedNoteContent);
      return json2md(parsed);
    } catch {
      return "";
    }
  };

  const getMemoMd = (): string => {
    if (!rawMd) return "";
    try {
      const parsed = JSON.parse(rawMd);
      return json2md(parsed);
    } catch {
      return "";
    }
  };

  const getTranscriptText = (): string => {
    if (transcriptItems.length === 0) return "";
    return transcriptItems
      .map((item) => {
        const speaker = item.speaker ? `${item.speaker}: ` : "";
        return `${speaker}${item.text}`;
      })
      .join("\n\n");
  };

  const buildTextContent = (): string => {
    const sections: string[] = [];
    const title = sessionTitle || "Untitled";
    const isMd = format === "md";

    if (isMd) {
      sections.push(`# ${title}`);
    } else {
      sections.push(title);
      sections.push("=".repeat(title.length));
    }

    if (sessionCreatedAt) {
      sections.push(formatDate(sessionCreatedAt));
    }

    if (participantNames.length > 0) {
      sections.push(`Participants: ${participantNames.join(", ")}`);
    }

    if (transcriptDuration) {
      sections.push(`Duration: ${transcriptDuration}`);
    }

    if (includeSummary) {
      const summary = getSummaryMd();
      if (summary) {
        sections.push("");
        if (isMd) {
          sections.push("## Summary");
        } else {
          sections.push("Summary");
          sections.push("-".repeat(7));
        }
        sections.push(isMd ? summary : summary.replace(/^#{1,6}\s/gm, ""));
      }
    }

    if (includeMemos) {
      const memo = getMemoMd();
      if (memo) {
        sections.push("");
        if (isMd) {
          sections.push("## Memos");
        } else {
          sections.push("Memos");
          sections.push("-".repeat(5));
        }
        sections.push(isMd ? memo : memo.replace(/^#{1,6}\s/gm, ""));
      }
    }

    if (includeTranscript) {
      const transcript = getTranscriptText();
      if (transcript) {
        sections.push("");
        if (isMd) {
          sections.push("## Transcript");
        } else {
          sections.push("Transcript");
          sections.push("-".repeat(10));
        }
        sections.push(transcript);
      }
    }

    return sections.join("\n");
  };

  const buildPdfContent = (): {
    enhancedMd: string;
    transcript: { items: TranscriptItem[] } | null;
    metadata: PdfMetadata | null;
  } => {
    const metadata: PdfMetadata = {
      title: sessionTitle || "Untitled",
      createdAt: sessionCreatedAt ? formatDate(sessionCreatedAt) : "",
      participants: participantNames,
      eventTitle: eventTitle || null,
      duration: transcriptDuration,
    };

    const parts: string[] = [];

    if (includeSummary) {
      const summary = getSummaryMd();
      if (summary) parts.push(summary);
    }

    if (includeMemos) {
      const memo = getMemoMd();
      if (memo) parts.push(memo);
    }

    return {
      enhancedMd: parts.join("\n\n"),
      transcript:
        includeTranscript && transcriptItems.length > 0
          ? { items: transcriptItems }
          : null,
      metadata,
    };
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const downloadsPath = await downloadDir();
      const sanitizedTitle = (
        (sessionTitle ?? "Untitled").trim() || "Untitled"
      ).replace(/[<>:"/\\|?*]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${sanitizedTitle}_${timestamp}.${format}`;
      const path = await join(downloadsPath, filename);

      if (format === "pdf") {
        const exportContent = buildPdfContent();
        const result = await pdfCommands.export(path, exportContent);
        if (result.status === "error") {
          throw new Error(result.error);
        }
      } else {
        const textContent = buildTextContent();
        const result = await pdfCommands.exportText(path, textContent);
        if (result.status === "error") {
          throw new Error(result.error);
        }
      }

      return path;
    },
    onSuccess: (path) => {
      if (path) {
        void analyticsCommands.event({
          event: "session_exported",
          format,
          include_summary: includeSummary,
          include_memos: includeMemos,
          include_transcript: includeTranscript,
        });
        void openerCommands.revealItemInDir(path);
      }
      setOpen(false);
    },
    onError: console.error,
  });

  const hasAnyContentSelected =
    includeSummary || includeMemos || includeTranscript;

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className="cursor-pointer"
      >
        <FileTextIcon />
        <span>Export</span>
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export</DialogTitle>
            <DialogDescription>
              Choose a file format and what to include.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">File format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as FileFormat)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="md">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Include</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) =>
                    setIncludeSummary(checked === true)
                  }
                />
                <Label htmlFor="include-summary" className="text-sm">
                  Summary
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-memos"
                  checked={includeMemos}
                  onCheckedChange={(checked) =>
                    setIncludeMemos(checked === true)
                  }
                />
                <Label htmlFor="include-memos" className="text-sm">
                  Memos
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-transcript"
                  checked={includeTranscript}
                  onCheckedChange={(checked) =>
                    setIncludeTranscript(checked === true)
                  }
                />
                <Label htmlFor="include-transcript" className="text-sm">
                  Transcript
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => mutate(null)}
              disabled={isPending || !hasAnyContentSelected}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <span>Export</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
