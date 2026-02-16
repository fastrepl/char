import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/utils";

import { restoreSessionData } from "../../../../store/tinybase/store/deleteSession";
import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";
import {
  UNDO_TIMEOUT_MS,
  useUndoDelete,
} from "../../../../store/zustand/undo-delete";

type ToastGroup = {
  key: string;
  sessionIds: string[];
  isBatch: boolean;
  addedAt: number;
};

function useToastGroups(): ToastGroup[] {
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);

  return useMemo(() => {
    const batchMap = new Map<string, string[]>();
    const singles: { sessionId: string; addedAt: number }[] = [];

    for (const [sessionId, pending] of Object.entries(pendingDeletions)) {
      if (pending.batchId) {
        const existing = batchMap.get(pending.batchId) ?? [];
        existing.push(sessionId);
        batchMap.set(pending.batchId, existing);
      } else {
        singles.push({ sessionId, addedAt: pending.addedAt });
      }
    }

    const groups: ToastGroup[] = [];

    for (const { sessionId, addedAt } of singles) {
      groups.push({
        key: sessionId,
        sessionIds: [sessionId],
        isBatch: false,
        addedAt,
      });
    }

    for (const [batchId, sessionIds] of batchMap) {
      const earliest = Math.min(
        ...sessionIds.map((id) => pendingDeletions[id].addedAt),
      );
      groups.push({
        key: batchId,
        sessionIds,
        isBatch: true,
        addedAt: earliest,
      });
    }

    groups.sort((a, b) => a.addedAt - b.addedAt);
    return groups;
  }, [pendingDeletions]);
}

function useRestoreGroup() {
  const store = main.UI.useStore(main.STORE_ID);
  const queryClient = useQueryClient();
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);
  const clearDeletion = useUndoDelete((state) => state.clearDeletion);
  const clearBatch = useUndoDelete((state) => state.clearBatch);
  const openCurrent = useTabs((state) => state.openCurrent);

  return useCallback(
    (group: ToastGroup) => {
      if (!store) return;

      for (const sessionId of group.sessionIds) {
        const pending = pendingDeletions[sessionId];
        if (!pending) continue;
        restoreSessionData(store, pending.data);
        void queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.length >= 2 &&
            query.queryKey[0] === "audio" &&
            query.queryKey[1] === sessionId,
        });
      }

      if (group.sessionIds.length > 0) {
        openCurrent({
          type: "sessions",
          id: group.sessionIds[0],
        });
      }

      if (group.isBatch) {
        clearBatch(group.key);
      } else {
        clearDeletion(group.sessionIds[0]);
      }
    },
    [
      store,
      pendingDeletions,
      openCurrent,
      clearDeletion,
      clearBatch,
      queryClient,
    ],
  );
}

function useConfirmGroup() {
  const confirmDeletion = useUndoDelete((state) => state.confirmDeletion);
  const confirmBatch = useUndoDelete((state) => state.confirmBatch);

  return useCallback(
    (group: ToastGroup) => {
      if (group.isBatch) {
        confirmBatch(group.key);
      } else {
        confirmDeletion(group.sessionIds[0]);
      }
    },
    [confirmDeletion, confirmBatch],
  );
}

function useGroupCountdown(group: ToastGroup) {
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);
  const [remaining, setRemaining] = useState(UNDO_TIMEOUT_MS);

  const { earliest, isPaused, frozenRemaining } = useMemo(() => {
    let min = Infinity;
    let paused = false;
    let frozen = 0;

    for (const id of group.sessionIds) {
      const p = pendingDeletions[id];
      if (!p) continue;
      min = Math.min(min, p.data.deletedAt);
      if (p.paused && p.pausedAt) {
        paused = true;
        const elapsed = p.pausedAt - p.data.deletedAt;
        frozen = Math.max(0, UNDO_TIMEOUT_MS - elapsed);
      }
    }

    return {
      earliest: min === Infinity ? Date.now() : min,
      isPaused: paused,
      frozenRemaining: frozen,
    };
  }, [group.sessionIds, pendingDeletions]);

  useEffect(() => {
    if (isPaused) {
      setRemaining(frozenRemaining);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - earliest;
      setRemaining(Math.max(0, UNDO_TIMEOUT_MS - elapsed));
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [earliest, isPaused, frozenRemaining]);

  return Math.ceil(remaining / 1000);
}

function useTriggerPosition(hasToasts: boolean) {
  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(
    null,
  );

  useEffect(() => {
    const find = () => {
      const el = document.querySelector(
        "[data-chat-trigger]",
      ) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({
          bottom: window.innerHeight - rect.top + 8,
          right: window.innerWidth - rect.right + rect.width / 2 - 8,
        });
      }
    };

    find();
    if (hasToasts) {
      const id = requestAnimationFrame(find);
      return () => cancelAnimationFrame(id);
    }
  }, [hasToasts]);

  return pos;
}

export function UndoDeleteKeyboardHandler() {
  const groups = useToastGroups();
  const restoreGroup = useRestoreGroup();

  const latestGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups[groups.length - 1];
  }, [groups]);

  useHotkeys(
    "mod+z",
    () => {
      if (latestGroup) {
        restoreGroup(latestGroup);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [latestGroup, restoreGroup],
  );

  return null;
}

export function UndoDeleteToast() {
  const groups = useToastGroups();
  const pos = useTriggerPosition(groups.length > 0);

  return createPortal(
    <AnimatePresence mode="popLayout">
      {pos &&
        groups.map((group, index) => (
          <ToastBubble
            key={group.key}
            group={group}
            index={index}
            total={groups.length}
            pos={pos}
          />
        ))}
    </AnimatePresence>,
    document.body,
  );
}

function ToastBubble({
  group,
  index,
  total,
  pos,
}: {
  group: ToastGroup;
  index: number;
  total: number;
  pos: { bottom: number; right: number };
}) {
  const restoreGroup = useRestoreGroup();
  const confirmGroup = useConfirmGroup();
  const seconds = useGroupCountdown(group);
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);
  const pauseGroup = useUndoDelete((state) => state.pauseGroup);
  const resumeGroup = useUndoDelete((state) => state.resumeGroup);

  const handleMouseEnter = useCallback(() => {
    pauseGroup(group.sessionIds);
  }, [pauseGroup, group.sessionIds]);

  const handleMouseLeave = useCallback(() => {
    resumeGroup(group.sessionIds);
  }, [resumeGroup, group.sessionIds]);

  const title = useMemo(() => {
    if (group.isBatch) return null;
    const p = pendingDeletions[group.sessionIds[0]];
    return p?.data.session.title || "Untitled";
  }, [group, pendingDeletions]);

  const stackOffset = (total - 1 - index) * 8;
  const stackScale = 1 - (total - 1 - index) * 0.03;
  const isTop = index === total - 1;

  const count = group.sessionIds.length;
  const undoLabel = group.isBatch ? "Restore all" : "Undo";
  const deleteLabel = group.isBatch ? "Delete all" : "Delete";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{
        opacity: isTop ? 1 : 0.6,
        y: -stackOffset,
        scale: stackScale,
      }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        bottom: pos.bottom,
        right: pos.right,
        zIndex: 50 + index,
        pointerEvents: isTop ? "auto" : "none",
      }}
      className="fixed"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn([
          "bg-white rounded-2xl rounded-br-sm",
          "shadow-xl px-5 py-4 w-[300px]",
          "border border-neutral-200",
        ])}
      >
        <p className="text-sm text-neutral-700 leading-relaxed">
          {group.isBatch ? (
            `Delete ${count} notes?`
          ) : (
            <>
              Delete{" "}
              <span className="font-medium text-neutral-900 truncate inline-block max-w-[180px] align-bottom">
                {title}
              </span>
              ?
            </>
          )}
        </p>
        <div className="flex items-stretch gap-2 mt-3">
          <button
            onClick={() => restoreGroup(group)}
            className={cn([
              "flex-1 text-sm font-medium py-2 rounded-xl",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:bg-primary/80",
              "transition-colors",
            ])}
          >
            {undoLabel} · {seconds}s
          </button>
          <button
            onClick={() => confirmGroup(group)}
            className={cn([
              "flex-1 text-sm font-medium py-2 rounded-xl",
              "bg-neutral-100 text-neutral-600",
              "hover:bg-red-100 hover:text-red-700",
              "transition-colors",
            ])}
          >
            {deleteLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
