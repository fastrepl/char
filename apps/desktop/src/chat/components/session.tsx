import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLanguageModel } from "~/ai/hooks";
import type { ContextEntity } from "~/chat/context-item";
import { composeContextEntities } from "~/chat/context/composer";
import { buildChatSystemContext } from "~/chat/context/prompt-context";
import { useCreateChatMessage } from "~/chat/hooks/useCreateChatMessage";
import { CustomChatTransport } from "~/chat/transport";
import type { HyprUIMessage } from "~/chat/types";
import { useToolRegistry } from "~/contexts/tool";
import { id } from "~/shared/utils";
import * as main from "~/store/tinybase/store/main";
import { useChatContext } from "~/store/zustand/chat-context";

import type { SessionContext } from "@hypr/plugin-template";
import { commands as templateCommands } from "@hypr/plugin-template";

import { useChatContextPipeline } from "./use-chat-context-pipeline";
import { useSessionContextEntity } from "./use-session-context-entity";

const EMPTY_CONTEXT_ENTITIES: ContextEntity[] = [];

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
  currentSessionId?: string;
  modelOverride?: LanguageModel;
  extraTools?: ToolSet;
  systemPromptOverride?: string;
  children: (props: {
    sessionId: string;
    messages: HyprUIMessage[];
    setMessages: (
      msgs: HyprUIMessage[] | ((prev: HyprUIMessage[]) => HyprUIMessage[]),
    ) => void;
    sendMessage: (message: HyprUIMessage) => void;
    regenerate: () => void;
    stop: () => void;
    status: ChatStatus;
    error?: Error;
    contextEntities: ContextEntity[];
    onRemoveContextEntity: (key: string) => void;
    isSystemPromptReady: boolean;
  }) => ReactNode;
}

export function ChatSession({
  sessionId,
  chatGroupId,
  currentSessionId,
  modelOverride,
  extraTools,
  systemPromptOverride,
  children,
}: ChatSessionProps) {
  const sessionEntity = useSessionContextEntity(currentSessionId);

  const persistContext = useChatContext((s) => s.persistContext);
  const persistedCtx = useChatContext((s) =>
    chatGroupId ? s.contexts[chatGroupId] : undefined,
  );
  const persistedEntities =
    persistedCtx?.contextEntities ?? EMPTY_CONTEXT_ENTITIES;

  const transportContextEntities = useMemo(() => {
    const sessionEntities: ContextEntity[] = sessionEntity
      ? [sessionEntity]
      : [];
    return composeContextEntities([sessionEntities, persistedEntities]);
  }, [sessionEntity, persistedEntities]);
  const sessionContext = useMemo(
    () => buildChatSystemContext(transportContextEntities).context,
    [transportContextEntities],
  );
  const { transport, isSystemPromptReady } = useTransport(
    sessionContext,
    modelOverride,
    extraTools,
    systemPromptOverride,
  );

  const store = main.UI.useStore(main.STORE_ID);
  const createChatMessage = useCreateChatMessage();

  const messageIds = main.UI.useSliceRowIds(
    main.INDEXES.chatMessagesByGroup,
    chatGroupId ?? "",
    main.STORE_ID,
  );

  const initialMessages = useMemo((): HyprUIMessage[] => {
    if (!store || !chatGroupId) {
      return [];
    }

    const loaded: HyprUIMessage[] = [];
    for (const messageId of messageIds) {
      const row = store.getRow("chat_messages", messageId);
      if (row) {
        let parsedParts: HyprUIMessage["parts"] = [];
        let parsedMetadata: Record<string, unknown> = {};
        try {
          parsedParts = JSON.parse(row.parts ?? "[]");
        } catch {}
        try {
          parsedMetadata = JSON.parse(row.metadata ?? "{}");
        } catch {}
        loaded.push({
          id: messageId as string,
          role: row.role as "user" | "assistant",
          parts: parsedParts,
          metadata: parsedMetadata,
        });
      }
    }
    return loaded;
  }, [store, messageIds, chatGroupId]);

  const {
    messages,
    setMessages,
    sendMessage: rawSendMessage,
    regenerate,
    stop,
    status,
    error,
  } = useChat({
    id: sessionId,
    messages: initialMessages,
    generateId: () => id(),
    transport: transport ?? undefined,
    onError: console.error,
  });

  useEffect(() => {
    if (!chatGroupId || !store) {
      return;
    }

    const assistantMessages = messages.filter(
      (message) => message.role === "assistant",
    );
    const assistantMessageIds = new Set(assistantMessages.map((m) => m.id));

    for (const messageId of messageIds) {
      if (assistantMessageIds.has(messageId)) {
        continue;
      }
      const row = store.getRow("chat_messages", messageId);
      if (row?.role === "assistant") {
        store.delRow("chat_messages", messageId);
      }
    }

    if (status === "ready") {
      for (const message of assistantMessages) {
        if (store.hasRow("chat_messages", message.id)) {
          continue;
        }
        const content = message.parts
          .filter(
            (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
          )
          .map((p) => p.text)
          .join("");

        createChatMessage({
          id: message.id,
          chat_group_id: chatGroupId,
          content,
          role: "assistant",
          parts: message.parts,
          metadata: message.metadata,
        });
      }
    }
  }, [chatGroupId, messages, status, store, createChatMessage, messageIds]);

  const { contextEntities, onRemoveContextEntity } = useChatContextPipeline({
    sessionId,
    chatGroupId,
    messages,
    sessionEntity,
    persistedEntities,
    persistContext,
  });

  return (
    <div className="flex-1 h-full flex flex-col">
      {children({
        sessionId,
        messages,
        setMessages,
        sendMessage: rawSendMessage,
        regenerate,
        stop,
        status,
        error,
        contextEntities,
        onRemoveContextEntity,
        isSystemPromptReady,
      })}
    </div>
  );
}

function useTransport(
  sessionContext: SessionContext | null,
  modelOverride?: LanguageModel,
  extraTools?: ToolSet,
  systemPromptOverride?: string,
) {
  const registry = useToolRegistry();
  const configuredModel = useLanguageModel("chat");
  const model = modelOverride ?? configuredModel;
  const language = main.UI.useValue("ai_language", main.STORE_ID) ?? "en";
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();

  useEffect(() => {
    if (systemPromptOverride) {
      setSystemPrompt(systemPromptOverride);
      return;
    }

    let stale = false;

    templateCommands
      .render({
        chatSystem: {
          language,
          context: sessionContext,
        },
      })
      .then((result) => {
        if (stale) {
          return;
        }

        if (result.status === "ok") {
          setSystemPrompt(result.data);
        } else {
          setSystemPrompt("");
        }
      })
      .catch((error) => {
        console.error(error);
        if (!stale) {
          setSystemPrompt("");
        }
      });

    return () => {
      stale = true;
    };
  }, [language, sessionContext, systemPromptOverride]);

  const effectiveSystemPrompt = systemPromptOverride ?? systemPrompt;
  const isSystemPromptReady =
    typeof systemPromptOverride === "string" || systemPrompt !== undefined;

  const tools = useMemo(() => {
    const localTools = registry.getTools("chat-general");

    if (extraTools && import.meta.env.DEV) {
      for (const key of Object.keys(extraTools)) {
        if (key in localTools) {
          console.warn(
            `[ChatSession] Tool name collision: "${key}" exists in both local registry and extraTools. extraTools will take precedence.`,
          );
        }
      }
    }

    return {
      ...localTools,
      ...extraTools,
    };
  }, [registry, extraTools]);

  const transport = useMemo(() => {
    if (!model) {
      return null;
    }

    return new CustomChatTransport(model, tools, effectiveSystemPrompt);
  }, [model, tools, effectiveSystemPrompt]);

  return {
    transport,
    isSystemPromptReady,
  };
}
