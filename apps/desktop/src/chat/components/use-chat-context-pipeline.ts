import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type ContextEntity,
  type ContextRef,
  CURRENT_SESSION_CONTEXT_KEY,
  dedupeByKey,
  extractToolContextEntities,
} from "~/chat/context-item";
import { hydrateSessionContextFromFs } from "~/chat/session-context-hydrator";
import type { HyprUIMessage } from "~/chat/types";
import type * as main from "~/store/tinybase/store/main";

type UseChatContextPipelineParams = {
  sessionId: string;
  chatGroupId?: string;
  messages: HyprUIMessage[];
  sessionEntity: Extract<ContextEntity, { kind: "session" }> | null;
  persistedRefs: ContextRef[];
  persistContext: (groupId: string, refs: ContextRef[]) => void;
  store: ReturnType<typeof main.UI.useStore>;
};

export function useChatContextPipeline({
  sessionId,
  chatGroupId,
  messages,
  sessionEntity,
  persistedRefs,
  persistContext,
  store,
}: UseChatContextPipelineParams): {
  contextEntities: ContextEntity[];
  onRemoveContextEntity: (key: string) => void;
} {
  const toolEntities = useMemo(
    () => extractToolContextEntities(messages),
    [messages],
  );

  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRemovedKeys(new Set());
  }, [sessionId, chatGroupId]);

  const onRemoveContextEntity = useCallback((key: string) => {
    setRemovedKeys((prev) => new Set(prev).add(key));
  }, []);

  // Hydrate persisted refs that aren't already provided by session/tool sources
  const liveKeys = useMemo(() => {
    const keys = new Set<string>();
    if (sessionEntity) keys.add(sessionEntity.key);
    for (const e of toolEntities) keys.add(e.key);
    return keys;
  }, [sessionEntity, toolEntities]);

  const [hydratedEntities, setHydratedEntities] = useState<
    Record<string, Extract<ContextEntity, { kind: "session" }>>
  >({});

  useEffect(() => {
    setHydratedEntities({});
  }, [sessionId, chatGroupId]);

  useEffect(() => {
    const toHydrate = persistedRefs.filter(
      (ref) => !liveKeys.has(ref.key) && !hydratedEntities[ref.key],
    );
    if (!store || toHydrate.length === 0) return;

    let stale = false;
    (async () => {
      const next: typeof hydratedEntities = {};
      for (const ref of toHydrate) {
        const sc = await hydrateSessionContextFromFs(store, ref.sessionId);
        if (sc) {
          next[ref.key] = {
            ...ref,
            sessionContext: sc,
            removable: ref.source !== "auto-current",
          };
        }
      }
      if (!stale && Object.keys(next).length > 0) {
        setHydratedEntities((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {
      stale = true;
    };
  }, [persistedRefs, liveKeys, hydratedEntities, store]);

  const contextEntities = useMemo(() => {
    const sessionEntities: ContextEntity[] = sessionEntity
      ? [sessionEntity]
      : [];
    const hydrated: ContextEntity[] = persistedRefs
      .filter((ref) => !liveKeys.has(ref.key))
      .map((ref) => hydratedEntities[ref.key] ?? { ...ref, removable: true });

    return dedupeByKey([sessionEntities, toolEntities, hydrated]).filter(
      (e) => !removedKeys.has(e.key),
    );
  }, [
    sessionEntity,
    toolEntities,
    persistedRefs,
    liveKeys,
    hydratedEntities,
    removedKeys,
  ]);

  // Persist manual context refs on change
  const lastPersisted = useRef<string>("");

  useEffect(() => {
    if (!chatGroupId) {
      lastPersisted.current = "";
      return;
    }

    const persistable = contextEntities
      .filter(
        (e): e is Extract<ContextEntity, { kind: "session" }> =>
          e.kind === "session" &&
          e.source !== "tool" &&
          e.key !== CURRENT_SESSION_CONTEXT_KEY,
      )
      .map(
        (e): ContextRef => ({
          kind: e.kind,
          key: e.key,
          source: e.source,
          sessionId: e.sessionId,
        }),
      );

    const fingerprint = JSON.stringify(persistable);
    if (fingerprint === lastPersisted.current) return;

    lastPersisted.current = fingerprint;
    persistContext(chatGroupId, persistable);
  }, [chatGroupId, contextEntities, persistContext]);

  return { contextEntities, onRemoveContextEntity };
}
