import type { ChatStatus } from "ai";

import { ChatBody } from "./body";
import { ContextBar } from "./context-bar";
import { ChatMessageInput, type McpIndicator } from "./input";

import type { useLanguageModel } from "~/ai/hooks";
import type { ContextEntity, ContextRef } from "~/chat/context/entities";
import type { HyprUIMessage } from "~/chat/types";

export function ChatContent({
  sessionId,
  messages,
  sendMessage,
  regenerate,
  stop,
  status,
  error,
  model,
  handleSendMessage,
  contextEntities,
  pendingRefs,
  onRemoveContextEntity,
  onAddContextEntity,
  isSystemPromptReady,
  mcpIndicator,
  children,
}: {
  sessionId: string;
  messages: HyprUIMessage[];
  sendMessage: (message: HyprUIMessage) => void;
  regenerate: () => void;
  stop: () => void;
  status: ChatStatus;
  error?: Error;
  model: ReturnType<typeof useLanguageModel>;
  handleSendMessage: (
    content: string,
    parts: HyprUIMessage["parts"],
    sendMessage: (message: HyprUIMessage) => void,
    contextRefs?: ContextRef[],
  ) => void;
  contextEntities: ContextEntity[];
  pendingRefs: ContextRef[];
  onRemoveContextEntity?: (key: string) => void;
  onAddContextEntity?: (ref: ContextRef) => void;
  isSystemPromptReady: boolean;
  mcpIndicator?: McpIndicator;
  children?: React.ReactNode;
}) {
  const disabled =
    !model ||
    status !== "ready" ||
    (status === "ready" && !isSystemPromptReady);

  return (
    <>
      {children ?? (
        <ChatBody
          messages={messages}
          status={status}
          error={error}
          onReload={regenerate}
          isModelConfigured={!!model}
        />
      )}
      <ContextBar
        entities={contextEntities}
        onRemoveEntity={onRemoveContextEntity}
        onAddEntity={onAddContextEntity}
      />
      <ChatMessageInput
        draftKey={sessionId}
        disabled={disabled}
        hasContextBar={contextEntities.length > 0}
        onSendMessage={(content, parts) => {
          handleSendMessage(content, parts, sendMessage, pendingRefs);
        }}
        isStreaming={status === "streaming" || status === "submitted"}
        onStop={stop}
        mcpIndicator={mcpIndicator}
      />
    </>
  );
}
