import { useMemo } from "react";

import {
  type ContextEntity,
  type ContextRef,
  extractToolContextEntities,
  dedupeByKey,
} from "./entities";

import type { HyprUIMessage } from "~/chat/types";
import type * as main from "~/store/tinybase/store/main";

function getSessionDisplayData(
  store: ReturnType<typeof main.UI.useStore>,
  sessionId: string,
): { title: string | null; date: string | null } {
  if (!store) {
    return { title: null, date: null };
  }
  const row = store.getRow("sessions", sessionId);
  return {
    title: typeof row.title === "string" && row.title.trim() ? row.title : null,
    date:
      typeof row.created_at === "string" && row.created_at.trim()
        ? row.created_at
        : null,
  };
}

// Normalize legacy "session:current" key to the per-session key format.
function normalizeRef(ref: ContextRef): ContextRef {
  if (ref.source === "auto-current" && ref.key === "session:current") {
    return { ...ref, key: `session:auto:${ref.sessionId}` };
  }
  return ref;
}

function extractCommittedRefs(messages: HyprUIMessage[]): ContextRef[] {
  const seen = new Set<string>();
  const refs: ContextRef[] = [];
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    for (const raw of msg.metadata?.contextRefs ?? []) {
      const ref = normalizeRef(raw);
      if (!seen.has(ref.key)) {
        seen.add(ref.key);
        refs.push(ref);
      }
    }
  }
  return refs;
}

type UseChatContextPipelineParams = {
  messages: HyprUIMessage[];
  currentSessionId?: string;
  pendingManualRefs: ContextRef[];
  store: ReturnType<typeof main.UI.useStore>;
};

export function useChatContextPipeline({
  messages,
  currentSessionId,
  pendingManualRefs,
  store,
}: UseChatContextPipelineParams): {
  contextEntities: ContextEntity[];
  pendingRefs: ContextRef[];
} {
  const committedRefs = useMemo(
    () => extractCommittedRefs(messages),
    [messages],
  );

  const toolEntities = useMemo(
    () => extractToolContextEntities(messages),
    [messages],
  );

  // Refs that will be attached to the next message send.
  const pendingRefs = useMemo((): ContextRef[] => {
    const refs: ContextRef[] = [];
    if (currentSessionId) {
      refs.push({
        kind: "session",
        key: `session:auto:${currentSessionId}`,
        source: "auto-current",
        sessionId: currentSessionId,
      });
    }
    for (const ref of pendingManualRefs) {
      refs.push(ref);
    }
    return refs;
  }, [currentSessionId, pendingManualRefs]);

  const contextEntities = useMemo(() => {
    const committedEntities: ContextEntity[] = committedRefs.map((ref) => ({
      ...ref,
      ...getSessionDisplayData(store, ref.sessionId),
      removable: false,
    }));

    // Pending manual refs are removable; pending auto-current is not.
    const pendingEntities: ContextEntity[] = pendingRefs.map((ref) => ({
      ...ref,
      ...getSessionDisplayData(store, ref.sessionId),
      removable: ref.source === "manual",
    }));

    return dedupeByKey([committedEntities, toolEntities, pendingEntities]);
  }, [committedRefs, toolEntities, pendingRefs, store]);

  return { contextEntities, pendingRefs };
}
