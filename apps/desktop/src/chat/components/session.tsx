import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { commands as templateCommands } from "@hypr/plugin-template";

import { useChatContextPipeline } from "./use-chat-context-pipeline";
import { useSessionContextEntity } from "./use-session-context-entity";

import { useLanguageModel } from "~/ai/hooks";
import type { ContextEntity, ContextRef } from "~/chat/context-item";
import { useCreateChatMessage } from "~/chat/hooks/useCreateChatMessage";
import { hydrateSessionContextFromFs } from "~/chat/session-context-hydrator";
import { CustomChatTransport } from "~/chat/transport";
import type { HyprUIMessage } from "~/chat/types";
import { useToolRegistry } from "~/contexts/tool";
import { id } from "~/shared/utils";
import * as main from "~/store/tinybase/store/main";
import { useChatContext } from "~/store/zustand/chat-context";

const EMPTY_CONTEXT_REFS: ContextRef[] = [];

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
    onAddContextEntity: (ref: ContextRef) => void;
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
  const store = main.UI.useStore(main.STORE_ID);

  const persistContext = useChatContext((s) => s.persistContext);
  const addRef = useChatContext((s) => s.addRef);
  const persistedCtx = useChatContext((s) =>
    chatGroupId ? s.contexts[chatGroupId] : undefined,
  );
  const persistedRefs = persistedCtx?.contextRefs ?? EMPTY_CONTEXT_REFS;

  const onAddContextEntity = useCallback(
    (ref: ContextRef) => {
      if (!chatGroupId) return;
      addRef(chatGroupId, ref);
    },
    [chatGroupId, addRef],
  );

  const { transport, isSystemPromptReady } = useTransport(
    modelOverride,
    extraTools,
    systemPromptOverride,
    store,
  );
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
    persistedRefs,
    persistContext,
    store,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
        onAddContextEntity,
        isSystemPromptReady,
      })}
    </div>
  );
}

function useTransport(
  modelOverride?: LanguageModel,
  extraTools?: ToolSet,
  systemPromptOverride?: string,
  store?: ReturnType<typeof main.UI.useStore>,
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
  }, [language, systemPromptOverride]);

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

    return new CustomChatTransport(
      model,
      tools,
      effectiveSystemPrompt,
      async (ref) => {
        if (ref.kind !== "session" || !store) {
          return null;
        }
        return hydrateSessionContextFromFs(store, ref.sessionId);
      },
    );
  }, [model, tools, effectiveSystemPrompt, store]);

  return {
    transport,
    isSystemPromptReady,
  };
}
