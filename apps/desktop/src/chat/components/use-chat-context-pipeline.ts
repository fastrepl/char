import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  composeContextRefs,
  type ContextEntity,
  type ContextRef,
  extractToolContextEntities,
  toContextRef,
} from "~/chat/context-item";
import { composeContextEntities } from "~/chat/context/composer";
import {
  getPersistableContextRefs,
  stableContextFingerprint,
} from "~/chat/context/prompt-context";
import { hydrateSessionContextFromFs } from "~/chat/session-context-hydrator";
import type { HyprUIMessage } from "~/chat/types";
import type * as main from "~/store/tinybase/store/main";

const EMPTY_REFS: ContextRef[] = [];

type UseChatContextPipelineParams = {
  sessionId: string;
  chatGroupId?: string;
  messages: HyprUIMessage[];
  sessionEntity: Extract<ContextEntity, { kind: "session" }> | null;
  persistedRefs?: ContextRef[];
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
  contextRefs: ContextRef[];
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

  const contextRefs = useMemo(() => {
    const sessionRefs = sessionEntity ? [toContextRef(sessionEntity)] : [];
    const toolRefs = toolEntities
      .map((entity) => toContextRef(entity))
      .filter((ref): ref is ContextRef => Boolean(ref));

    return composeContextRefs([
      sessionRefs.filter((ref): ref is ContextRef => Boolean(ref)),
      toolRefs,
      persistedRefs ?? EMPTY_REFS,
    ]).filter((ref) => !removedKeys.has(ref.key));
  }, [sessionEntity, toolEntities, persistedRefs, removedKeys]);

  const [hydratedRefsByKey, setHydratedRefsByKey] = useState<
    Record<string, Extract<ContextEntity, { kind: "session" }>>
  >({});

  useEffect(() => {
    setHydratedRefsByKey({});
  }, [sessionId, chatGroupId]);

  const nonPersistedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (sessionEntity) {
      keys.add(sessionEntity.key);
    }
    for (const entity of toolEntities) {
      keys.add(entity.key);
    }
    return keys;
  }, [sessionEntity, toolEntities]);

  useEffect(() => {
    const refsToHydrate = contextRefs.filter(
      (ref) => !nonPersistedKeys.has(ref.key) && !hydratedRefsByKey[ref.key],
    );
    if (!store || refsToHydrate.length === 0) {
      return;
    }

    let stale = false;

    (async () => {
      const next: Record<
        string,
        Extract<ContextEntity, { kind: "session" }>
      > = {};
      for (const ref of refsToHydrate) {
        const sessionContext = await hydrateSessionContextFromFs(
          store,
          ref.sessionId,
        );
        if (!sessionContext) {
          continue;
        }
        next[ref.key] = {
          kind: "session",
          key: ref.key,
          source: ref.source,
          sessionId: ref.sessionId,
          sessionContext,
          removable: ref.source !== "auto-current",
        };
      }

      if (!stale && Object.keys(next).length > 0) {
        setHydratedRefsByKey((prev) => ({ ...prev, ...next }));
      }
    })();

    return () => {
      stale = true;
    };
  }, [contextRefs, hydratedRefsByKey, nonPersistedKeys, store]);

  const contextEntities = useMemo(() => {
    const sessionEntities: ContextEntity[] = sessionEntity
      ? [sessionEntity]
      : [];
    const hydratedEntities = contextRefs.flatMap((ref) => {
      if (nonPersistedKeys.has(ref.key)) {
        return [];
      }
      const entity = hydratedRefsByKey[ref.key];
      return entity ? [entity] : [];
    });

    return composeContextEntities([
      sessionEntities,
      toolEntities,
      hydratedEntities,
    ]).filter((entity) => !removedKeys.has(entity.key));
  }, [
    contextRefs,
    hydratedRefsByKey,
    nonPersistedKeys,
    removedKeys,
    sessionEntity,
    toolEntities,
  ]);

  const persistableRefs = useMemo(
    () => getPersistableContextRefs(contextRefs),
    [contextRefs],
  );
  const persistedRef = useRef<{
    chatGroupId: string;
    fingerprint: string;
  } | null>(null);

  const persistFingerprint = useMemo(
    () => stableContextFingerprint(persistableRefs),
    [persistableRefs],
  );

  useEffect(() => {
    if (!chatGroupId) {
      persistedRef.current = null;
      return;
    }

    const prev = persistedRef.current;
    if (
      prev &&
      prev.chatGroupId === chatGroupId &&
      prev.fingerprint === persistFingerprint
    ) {
      return;
    }

    persistContext(chatGroupId, persistableRefs);
    persistedRef.current = {
      chatGroupId,
      fingerprint: persistFingerprint,
    };
  }, [chatGroupId, persistContext, persistFingerprint, persistableRefs]);

  return {
    contextEntities,
    contextRefs,
    onRemoveContextEntity,
  };
}
