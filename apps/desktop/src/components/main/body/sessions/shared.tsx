import { useMemo } from "react";

import { Button } from "@hypr/ui/components/ui/button";

import { useListener } from "../../../../contexts/listener";
import { useNetwork } from "../../../../contexts/network";
import { useAITaskTask } from "../../../../hooks/useAITaskTask";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import * as main from "../../../../store/tinybase/store/main";
import { createTaskId } from "../../../../store/zustand/ai-task/task-configs";
import type { Tab } from "../../../../store/zustand/tabs/schema";
import { type EditorView } from "../../../../store/zustand/tabs/schema";

export function useHasTranscript(sessionId: string): boolean {
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  return !!transcriptIds && transcriptIds.length > 0;
}

export function computeCurrentNoteTab(
  tabView: EditorView | null,
  isListenerActive: boolean,
  firstEnhancedNoteId: string | undefined,
): EditorView {
  if (isListenerActive) {
    if (tabView?.type === "raw" || tabView?.type === "transcript") {
      return tabView;
    }
    return { type: "raw" };
  }

  if (tabView) {
    return tabView;
  }

  if (firstEnhancedNoteId) {
    return { type: "enhanced", id: firstEnhancedNoteId };
  }

  return { type: "raw" };
}

export function useCurrentNoteTab(
  tab: Extract<Tab, { type: "sessions" }>,
): EditorView {
  const sessionMode = useListener((state) => state.getSessionMode(tab.id));
  const isListenerActive =
    sessionMode === "active" || sessionMode === "finalizing";

  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    tab.id,
    main.STORE_ID,
  );
  const firstEnhancedNoteId = enhancedNoteIds?.[0];

  return useMemo(
    () =>
      computeCurrentNoteTab(
        tab.state.view ?? null,
        isListenerActive,
        firstEnhancedNoteId,
      ),
    [tab.state.view, isListenerActive, firstEnhancedNoteId],
  );
}

export function RecordingIcon() {
  return <div className="size-2 rounded-full bg-red-500" />;
}

export function useListenButtonState(sessionId: string) {
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const lastError = useListener((state) => state.live.lastError);
  const active = sessionMode === "active" || sessionMode === "finalizing";
  const batching = sessionMode === "running_batch";

  const taskId = createTaskId(sessionId, "enhance");
  const { status } = useAITaskTask(taskId, "enhance");
  const generating = status === "generating";
  const { conn: sttConnection, local, isLocalModel } = useSTTConnection();
  const { isOnline } = useNetwork();

  const localServerStatus = local.data?.status ?? "unavailable";
  const isLocalServerLoading = localServerStatus === "loading";
  const isLocalModelNotDownloaded = localServerStatus === "not_downloaded";

  const isOfflineWithCloudModel = !isOnline && !isLocalModel;

  const shouldRender = !active && !generating;
  const isDisabled =
    !sttConnection ||
    batching ||
    isLocalServerLoading ||
    isLocalModelNotDownloaded ||
    isOfflineWithCloudModel;

  let warningMessage = "";
  if (lastError) {
    warningMessage = `Session failed: ${lastError}`;
  } else if (isLocalModelNotDownloaded) {
    warningMessage = "Selected model is not downloaded.";
  } else if (isLocalServerLoading) {
    warningMessage = "Local STT server is starting up...";
  } else if (isOfflineWithCloudModel) {
    warningMessage = "You're offline. Use on-device models to continue.";
  } else if (!sttConnection) {
    warningMessage = "Transcription model not available.";
  } else if (batching) {
    warningMessage = "Batch transcription in progress.";
  }

  return {
    shouldRender,
    isDisabled,
    warningMessage,
  };
}

export function ActionableTooltipContent({
  message,
  action,
}: {
  message: string;
  action?: {
    label: string;
    handleClick: () => void;
  };
}) {
  return (
    <div className="flex flex-row items-center gap-3">
      <p className="text-xs">{message}</p>
      {action && (
        <Button
          size="sm"
          variant="outline"
          className="text-black rounded-md"
          onClick={action.handleClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
