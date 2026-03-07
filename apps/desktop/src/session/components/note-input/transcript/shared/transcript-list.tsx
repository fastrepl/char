import { type RefObject, useCallback } from "react";

import type { DegradedError } from "@hypr/plugin-listener";
import type { PartialWord, RuntimeSpeakerHint } from "@hypr/transcript";
import { cn } from "@hypr/utils";

import type { Operations } from "./operations";
import { RenderTranscript } from "./render-transcript";
import { SelectionMenu } from "./selection-menu";
import { DegradedState } from "./transcript-status";

export function TranscriptList({
  containerRef,
  scrollElement,
  transcriptIds,
  currentActive,
  degraded,
  editable,
  operations,
  partialWords,
  partialHints,
  isAtBottom,
  currentMs,
  seek,
  startPlayback,
  audioExists,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollElement: HTMLDivElement | null;
  transcriptIds: string[];
  currentActive: boolean;
  degraded?: DegradedError | null;
  editable: boolean;
  operations?: Operations;
  partialWords: PartialWord[];
  partialHints: RuntimeSpeakerHint[];
  isAtBottom: boolean;
  currentMs: number;
  seek: (sec: number) => void;
  startPlayback: () => void;
  audioExists: boolean;
}) {
  const handleSelectionAction = useCallback(
    (action: string, selectedText: string) => {
      if (action === "copy") {
        void navigator.clipboard.writeText(selectedText);
      }
    },
    [],
  );

  if (degraded) {
    return <DegradedState error={degraded} />;
  }

  return (
    <>
      {transcriptIds.map((transcriptId, index) => {
        const isLastTranscript = index === transcriptIds.length - 1;
        const shouldRenderPartial = currentActive && isLastTranscript;

        return (
          <div key={transcriptId} className="flex flex-col gap-8">
            <RenderTranscript
              scrollElement={scrollElement}
              isLastTranscript={isLastTranscript}
              isAtBottom={isAtBottom}
              editable={editable}
              transcriptId={transcriptId}
              partialWords={shouldRenderPartial ? partialWords : []}
              partialHints={shouldRenderPartial ? partialHints : []}
              operations={operations}
              currentMs={currentMs}
              seek={seek}
              startPlayback={startPlayback}
              audioExists={audioExists}
            />
            {!isLastTranscript && <TranscriptSeparator />}
          </div>
        );
      })}

      {editable && (
        <SelectionMenu
          containerRef={containerRef}
          onAction={handleSelectionAction}
        />
      )}
    </>
  );
}

function TranscriptSeparator() {
  return (
    <div
      className={cn([
        "flex items-center gap-3",
        "text-xs font-light text-neutral-400",
      ])}
    >
      <div className="flex-1 border-t border-neutral-200/40" />
      <span>~ ~ ~ ~ ~ ~ ~ ~ ~</span>
      <div className="flex-1 border-t border-neutral-200/40" />
    </div>
  );
}
