import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import type { ContextEntity } from "../../../../chat/context-item";
import { composeContextEntities } from "../../../../chat/context/composer";
import type { HyprUIMessage } from "../../../../chat/types";
import { ElicitationProvider } from "../../../../contexts/elicitation";
import { useChatwootPersistence } from "../../../../hooks/useChatwootPersistence";
import { useFeedbackLanguageModel } from "../../../../hooks/useLLMConnection";
import { useSupportMCP } from "../../../../hooks/useSupportMCP";
import type { Tab } from "../../../../store/zustand/tabs";
import { useTabs } from "../../../../store/zustand/tabs";
import { ChatBody } from "../../../chat/body";
import { ChatContent } from "../../../chat/content";
import { ChatSession } from "../../../chat/session";
import {
  useChatActions,
  useStableSessionId,
} from "../../../chat/use-chat-actions";
import { StandardTabWrapper } from "../index";

export function TabContentChat({
  tab,
}: {
  tab: Extract<Tab, { type: "chat_support" }>;
}) {
  return (
    <StandardTabWrapper>
      <SupportChatTabView tab={tab} />
    </StandardTabWrapper>
  );
}

function SupportChatTabView({
  tab,
}: {
  tab: Extract<Tab, { type: "chat_support" }>;
}) {
  const groupId = tab.state.groupId ?? undefined;
  const updateChatSupportTabState = useTabs(
    (state) => state.updateChatSupportTabState,
  );
  const { session } = useAuth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const stableSessionId = useStableSessionId(groupId);
  const feedbackModel = useFeedbackLanguageModel();
  const {
    tools: mcpTools,
    systemPrompt,
    contextEntities: supportContextEntities,
    pendingElicitation,
    respondToElicitation,
    isReady,
  } = useSupportMCP(true, session?.access_token);

  const chatwoot = useChatwootPersistence(userId, {
    email: userEmail,
    name: userEmail,
  });

  const mcpToolCount = Object.keys(mcpTools).length;

  const onGroupCreated = useCallback(
    (newGroupId: string) =>
      updateChatSupportTabState(tab, {
        ...tab.state,
        groupId: newGroupId,
        initialMessage: null,
      }),
    [updateChatSupportTabState, tab],
  );

  const { handleSendMessage } = useChatActions({
    groupId,
    onGroupCreated,
  });

  if (!isReady) {
    return (
      <div className="flex flex-col h-full bg-sky-50/40">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="size-4 animate-spin" />
            <span>Preparing support chat...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(["flex flex-col h-full", "bg-sky-50/40"])}>
      <ChatSession
        key={`${stableSessionId}-${mcpToolCount}`}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        modelOverride={feedbackModel}
        extraTools={mcpTools}
        systemPromptOverride={systemPrompt}
      >
        {(sessionProps) => (
          <SupportChatTabInner
            tab={tab}
            sessionProps={sessionProps}
            feedbackModel={feedbackModel}
            handleSendMessage={handleSendMessage}
            updateChatSupportTabState={updateChatSupportTabState}
            supportContextEntities={supportContextEntities}
            pendingElicitation={pendingElicitation}
            respondToElicitation={respondToElicitation}
            chatwoot={chatwoot}
          />
        )}
      </ChatSession>
    </div>
  );
}

function SupportChatTabInner({
  tab,
  sessionProps,
  feedbackModel,
  handleSendMessage,
  updateChatSupportTabState,
  supportContextEntities,
  pendingElicitation,
  respondToElicitation,
  chatwoot,
}: {
  tab: Extract<Tab, { type: "chat_support" }>;
  sessionProps: {
    sessionId: string;
    messages: HyprUIMessage[];
    setMessages: (
      msgs: HyprUIMessage[] | ((prev: HyprUIMessage[]) => HyprUIMessage[]),
    ) => void;
    sendMessage: (message: HyprUIMessage) => void;
    regenerate: () => void;
    stop: () => void;
    status: "submitted" | "streaming" | "ready" | "error";
    error?: Error;
    contextEntities: ContextEntity[];
    onRemoveContextEntity: (key: string) => void;
    isSystemPromptReady: boolean;
  };
  feedbackModel: ReturnType<typeof useFeedbackLanguageModel>;
  handleSendMessage: (
    content: string,
    parts: HyprUIMessage["parts"],
    sendMessage: (message: HyprUIMessage) => void,
  ) => void;
  updateChatSupportTabState: (
    tab: Extract<Tab, { type: "chat_support" }>,
    state: Extract<Tab, { type: "chat_support" }>["state"],
  ) => void;
  supportContextEntities: ContextEntity[];
  pendingElicitation?: { message: string } | null;
  respondToElicitation?: (approved: boolean) => void;
  chatwoot: ReturnType<typeof useChatwootPersistence>;
}) {
  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    contextEntities,
    onRemoveContextEntity,
    isSystemPromptReady,
  } = sessionProps;
  const sentRef = useRef(false);
  const chatwootConvStartedRef = useRef(false);
  const lastPersistedCountRef = useRef(0);

  useEffect(() => {
    if (
      chatwoot.isReady &&
      !chatwoot.conversationId &&
      !chatwootConvStartedRef.current
    ) {
      chatwootConvStartedRef.current = true;
      chatwoot.startConversation();
    }
  }, [chatwoot.isReady, chatwoot.conversationId, chatwoot.startConversation]);

  useEffect(() => {
    if (
      !chatwoot.conversationId ||
      status === "streaming" ||
      status === "submitted"
    ) {
      return;
    }

    const newMessages = messages.slice(lastPersistedCountRef.current);
    if (newMessages.length === 0) {
      return;
    }

    lastPersistedCountRef.current = messages.length;

    for (const msg of newMessages) {
      const textContent = msg.parts
        .filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
        )
        .map((p) => p.text)
        .join("");

      if (!textContent) {
        continue;
      }

      if (msg.role === "user") {
        chatwoot.persistUserMessage(textContent).catch(console.error);
      } else if (msg.role === "assistant") {
        chatwoot.persistAgentMessage(textContent).catch(console.error);
      }
    }
  }, [
    messages,
    status,
    chatwoot.conversationId,
    chatwoot.persistUserMessage,
    chatwoot.persistAgentMessage,
  ]);

  useEffect(() => {
    const initialMessage = tab.state.initialMessage;
    if (
      !initialMessage ||
      sentRef.current ||
      !feedbackModel ||
      status !== "ready" ||
      !isSystemPromptReady
    ) {
      return;
    }

    sentRef.current = true;
    handleSendMessage(
      initialMessage,
      [{ type: "text", text: initialMessage }],
      sendMessage,
    );
    updateChatSupportTabState(tab, {
      ...tab.state,
      initialMessage: null,
    });
  }, [
    tab,
    feedbackModel,
    status,
    isSystemPromptReady,
    handleSendMessage,
    sendMessage,
    updateChatSupportTabState,
  ]);

  const mergedContextEntities = composeContextEntities([
    contextEntities,
    supportContextEntities,
  ]);

  return (
    <ChatContent
      sessionId={sessionProps.sessionId}
      messages={messages}
      sendMessage={sendMessage}
      regenerate={regenerate}
      stop={stop}
      status={status}
      error={error}
      model={feedbackModel}
      handleSendMessage={handleSendMessage}
      contextEntities={mergedContextEntities}
      onRemoveContextEntity={onRemoveContextEntity}
      isSystemPromptReady={isSystemPromptReady}
      mcpIndicator={{ type: "support" }}
    >
      <ElicitationProvider
        pending={pendingElicitation ?? null}
        respond={respondToElicitation ?? null}
      >
        <ChatBody
          messages={messages}
          status={status}
          error={error}
          onReload={regenerate}
          isModelConfigured={!!feedbackModel}
        />
      </ElicitationProvider>
    </ChatContent>
  );
}
