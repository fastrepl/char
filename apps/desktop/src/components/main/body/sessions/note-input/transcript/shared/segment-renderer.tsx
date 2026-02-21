import { memo, useCallback, useMemo } from "react";

import type { Operations, Segment, SegmentWord } from "@hypr/transcript";
import { SpeakerLabelManager } from "@hypr/transcript";
import { groupWordsIntoLines } from "@hypr/transcript/ui";
import { cn } from "@hypr/utils";

import { useAudioPlayer } from "../../../../../../../contexts/audio-player/provider";
import { SegmentHeader } from "./segment-header";
import { WordSpan } from "./word-span";

export const SegmentRenderer = memo(
  ({
    editable,
    segment,
    offsetMs,
    operations,
    sessionId,
    speakerLabelManager,
  }: {
    editable: boolean;
    segment: Segment;
    offsetMs: number;
    operations?: Operations;
    sessionId?: string;
    speakerLabelManager?: SpeakerLabelManager;
  }) => {
    const { time, seek, start, audioExists } = useAudioPlayer();
    const currentMs = time.current * 1000;

    const seekAndPlay = useCallback(
      (word: SegmentWord) => {
        if (audioExists) {
          seek((offsetMs + word.start_ms) / 1000);
          start();
        }
      },
      [audioExists, offsetMs, seek, start],
    );

    const lines = useMemo(
      () => groupWordsIntoLines(segment.words),
      [segment.words],
    );

    return (
      <section>
        <SegmentHeader
          segment={segment}
          operations={operations}
          sessionId={sessionId}
          speakerLabelManager={speakerLabelManager}
        />

        <div
          className={cn([
            "mt-1.5 text-sm leading-relaxed wrap-break-word overflow-wrap-anywhere",
            editable && "select-text-deep",
          ])}
        >
          {lines.map((line, lineIdx) => {
            const lineStartMs = offsetMs + line.startMs;
            const lineEndMs = offsetMs + line.endMs;
            const isCurrentLine =
              audioExists &&
              currentMs > 0 &&
              currentMs >= lineStartMs &&
              currentMs <= lineEndMs;

            return (
              <span
                key={line.words[0]?.id ?? `line-${lineIdx}`}
                data-line-current={isCurrentLine ? "true" : undefined}
                className={cn([
                  "rounded-xs -mx-0.5 px-0.5",
                  isCurrentLine && "bg-yellow-100/50",
                ])}
              >
                {line.words.map((word, idx) => (
                  <WordSpan
                    key={word.id ?? `${word.start_ms}-${idx}`}
                    word={word}
                    audioExists={audioExists}
                    operations={operations}
                    onClickWord={seekAndPlay}
                  />
                ))}
              </span>
            );
          })}
        </div>
      </section>
    );
  },
  (prev, next) => {
    return (
      prev.editable === next.editable &&
      prev.segment === next.segment &&
      prev.offsetMs === next.offsetMs &&
      prev.operations === next.operations &&
      prev.sessionId === next.sessionId &&
      prev.speakerLabelManager === next.speakerLabelManager
    );
  },
);
