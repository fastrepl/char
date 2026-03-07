import { type RefObject, useCallback, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import {
  useAutoScroll,
  usePartialTranscriptState,
  usePlaybackAutoScroll,
  useScrollDetection,
  useTranscriptPlaybackState,
} from "./hooks";
import type { Operations } from "./operations";
import { TranscriptList } from "./transcript-list";
import { DegradedState, ScrollToBottomButton } from "./transcript-status";

import { TranscriptEmptyState } from "~/session/components/note-input/transcript/empty-state";
import * as main from "~/store/tinybase/store/main";
import { useListener } from "~/stt/contexts";

export { SegmentRenderer } from "./segment-renderer";

export function TranscriptContainer({
  sessionId,
  operations,
  scrollRef,
}: {
  sessionId: string;
  operations?: Operations;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const degraded = useListener((state) => state.live.degraded);
  const currentActive =
    sessionMode === "active" || sessionMode === "finalizing";
  const editable =
    sessionMode === "inactive" && Object.keys(operations ?? {}).length > 0;
  const { partialWords, partialHints } = usePartialTranscriptState();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  const handleContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setScrollElement(node);
      scrollRef.current = node;
    },
    [scrollRef],
  );

  const { isAtBottom, autoScrollEnabled, scrollToBottom } =
    useScrollDetection(containerRef);

  const { currentMs, isPlaying, seek, startPlayback, audioExists } =
    useTranscriptPlaybackState();

  usePlaybackAutoScroll(containerRef, currentMs, isPlaying);
  const shouldAutoScroll = currentActive && autoScrollEnabled;
  useAutoScroll(
    containerRef,
    [transcriptIds, partialWords, shouldAutoScroll],
    shouldAutoScroll,
  );
  if (transcriptIds.length === 0) {
    if (currentActive && degraded) {
      return <DegradedState error={degraded} />;
    }
    return (
      <TranscriptEmptyState isBatching={sessionMode === "running_batch"} />
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={handleContainerRef}
        data-transcript-container
        className={cn([
          "flex h-full flex-col gap-8 overflow-x-hidden overflow-y-auto",
          "scrollbar-hide scroll-pb-32 pb-16",
        ])}
      >
        <TranscriptList
          containerRef={containerRef}
          scrollElement={scrollElement}
          transcriptIds={transcriptIds}
          currentActive={currentActive}
          degraded={currentActive ? degraded : null}
          editable={editable}
          operations={operations}
          partialWords={partialWords}
          partialHints={partialHints}
          isAtBottom={isAtBottom}
          currentMs={currentMs}
          seek={seek}
          startPlayback={startPlayback}
          audioExists={audioExists}
        />
      </div>

      <ScrollToBottomButton
        onClick={scrollToBottom}
        visible={!isAtBottom && currentActive}
      />
    </div>
  );
}
