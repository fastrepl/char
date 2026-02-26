import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ContextEntity,
  extractToolContextEntities,
} from "~/chat/context-item";
import { composeContextEntities } from "~/chat/context/composer";
import {
  getPersistableContextEntities,
  stableContextFingerprint,
} from "~/chat/context/prompt-context";
import type { HyprUIMessage } from "~/chat/types";

const EMPTY_ENTITIES: ContextEntity[] = [];

type UseChatContextPipelineParams = {
  sessionId: string;
  chatGroupId?: string;
  messages: HyprUIMessage[];
  sessionEntity: Extract<ContextEntity, { kind: "session" }> | null;
  persistedEntities?: ContextEntity[];
  persistContext: (groupId: string, entities: ContextEntity[]) => void;
};

export function useChatContextPipeline({
  sessionId,
  chatGroupId,
  messages,
  sessionEntity,
  persistedEntities,
  persistContext,
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

  const contextEntities = useMemo(() => {
    const sessionEntities: ContextEntity[] = sessionEntity
      ? [sessionEntity]
      : [];
    return composeContextEntities([
      sessionEntities,
      toolEntities,
      persistedEntities ?? EMPTY_ENTITIES,
    ]).filter((entity) => !removedKeys.has(entity.key));
  }, [sessionEntity, toolEntities, removedKeys, persistedEntities]);

  const promptEntities = useMemo(
    () => getPersistableContextEntities(contextEntities),
    [contextEntities],
  );
  const persistedRef = useRef<{
    chatGroupId: string;
    fingerprint: string;
  } | null>(null);

  const persistFingerprint = useMemo(
    () => stableContextFingerprint(promptEntities),
    [promptEntities],
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

    persistContext(chatGroupId, promptEntities);
    persistedRef.current = {
      chatGroupId,
      fingerprint: persistFingerprint,
    };
  }, [chatGroupId, promptEntities, persistContext, persistFingerprint]);

  return {
    contextEntities,
    onRemoveContextEntity,
  };
}
