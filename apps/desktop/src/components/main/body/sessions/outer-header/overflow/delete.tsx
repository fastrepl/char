import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/utils";

import {
  captureSessionData,
  deleteSessionCascade,
} from "../../../../../../store/tinybase/store/deleteSession";
import * as main from "../../../../../../store/tinybase/store/main";
import { useTabs } from "../../../../../../store/zustand/tabs";
import { useUndoDelete } from "../../../../../../store/zustand/undo-delete";

export function DeleteNote({ sessionId }: { sessionId: string }) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const invalidateResource = useTabs((state) => state.invalidateResource);
  const addDeletion = useUndoDelete((state) => state.addDeletion);

  const handleDeleteNote = useCallback(() => {
    if (!store) {
      return;
    }

    const capturedData = captureSessionData(store, indexes, sessionId);

    invalidateResource("sessions", sessionId);
    void deleteSessionCascade(store, indexes, sessionId, {
      skipAudio: true,
    });

    if (capturedData) {
      addDeletion(capturedData, () => {
        void fsSyncCommands.audioDelete(sessionId);
      });
    }

    void analyticsCommands.event({
      event: "session_deleted",
      includes_recording: true,
    });
  }, [store, indexes, sessionId, invalidateResource, addDeletion]);

  return (
    <DropdownMenuItem
      onClick={handleDeleteNote}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
    >
      <TrashIcon />
      <span>Delete note</span>
    </DropdownMenuItem>
  );
}

export function DeleteRecording({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { mutate, isPending, isError } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)),
        fsSyncCommands.audioDelete(sessionId).then((result) => {
          if (result.status === "error") {
            throw new Error(result.error);
          }

          return result.data;
        }),
      ]);
    },
    onSuccess: () => {
      void analyticsCommands.event({
        event: "recording_deleted",
      });
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.length >= 2 &&
          query.queryKey[0] === "audio" &&
          query.queryKey[1] === sessionId,
      });
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        mutate();
      }}
      disabled={isPending}
      className={cn([
        "cursor-pointer",
        isError
          ? "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          : "text-red-600 hover:bg-red-50 hover:text-red-700",
      ])}
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <TrashIcon />}
      <span>
        {isPending
          ? "Deleting..."
          : isError
            ? "Failed to delete"
            : "Delete only recording"}
      </span>
    </DropdownMenuItem>
  );
}
