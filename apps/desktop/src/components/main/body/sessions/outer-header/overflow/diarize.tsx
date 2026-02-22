import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, UsersIcon } from "lucide-react";

import {
  type DiarizationSegment,
  commands as listener2Commands,
} from "@hypr/plugin-listener2";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

import * as main from "../../../../../../store/tinybase/store/main";
import type { SpeakerHintWithId } from "../../../../../../store/transcript/types";
import {
  parseTranscriptHints,
  parseTranscriptWords,
  updateTranscriptHints,
} from "../../../../../../store/transcript/utils";
import { id } from "../../../../../../utils";

export function Diarize({ sessionId }: { sessionId: string }) {
  const store = main.UI.useStore(main.STORE_ID);
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);

  const { mutate, isPending } = useMutation({
    mutationFn: async (maxSpeakers: number) => {
      const result = await listener2Commands.diarizeSession(
        sessionId,
        maxSpeakers,
      );
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (segments: DiarizationSegment[]) => {
      if (!store || !transcriptIds || transcriptIds.length === 0) {
        return;
      }

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
        const existingHints = parseTranscriptHints(store, transcriptId);
        const newHints: SpeakerHintWithId[] = [];

        for (const word of words) {
          if (word.start_ms === undefined || word.end_ms === undefined) {
            continue;
          }

          const wordStartSec = (word.start_ms + offset) / 1000;
          const wordEndSec = (word.end_ms + offset) / 1000;
          const wordMidSec = (wordStartSec + wordEndSec) / 2;

          const matchedSegment = segments.find(
            (seg) => seg.start <= wordMidSec && wordMidSec < seg.end,
          );

          if (matchedSegment) {
            newHints.push({
              id: id(),
              word_id: word.id,
              type: "provider_speaker_index",
              value: JSON.stringify({
                speaker_index: matchedSegment.speaker,
                provider: "pyannote-local",
              }),
            });
          }
        }

        const filteredHints = existingHints.filter((h) => {
          if (h.type !== "provider_speaker_index") return true;
          try {
            const v = JSON.parse(h.value as string);
            return v.provider !== "pyannote-local";
          } catch {
            return true;
          }
        });

        updateTranscriptHints(store, transcriptId, [
          ...filteredHints,
          ...newHints,
        ]);
      }

      checkpoints?.addCheckpoint("diarize_speakers");
    },
  });

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {isPending ? <Loader2Icon className="animate-spin" /> : <UsersIcon />}
        <span>{isPending ? "Diarizing..." : "Diarize Speakers"}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            mutate(2);
          }}
          disabled={isPending}
        >
          2 speakers
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            mutate(3);
          }}
          disabled={isPending}
        >
          3 speakers
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            mutate(4);
          }}
          disabled={isPending}
        >
          4 speakers
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            mutate(6);
          }}
          disabled={isPending}
        >
          Auto (up to 6)
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
