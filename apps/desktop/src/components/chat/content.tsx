import type { ChatStatus } from "ai";

import type { ContextEntity } from "../../chat/context-item";
import { buildContextBlock } from "../../chat/context/prompt-context";
import type { HyprUIMessage } from "../../chat/types";
import type { useLanguageModel } from "../../hooks/useLLMConnection";
import { ChatBody } from "./body";
import { ContextBar } from "./context-bar";
import { ChatMessageInput, type McpIndicator } from "./input";

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
    contextBlock?: string,
  ) => void;
  contextEntities: ContextEntity[];
  onRemoveContextEntity?: (key: string) => void;
  onAddContextEntity?: (entity: ContextEntity) => void;
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
          const block = buildContextBlock(contextEntities) ?? undefined;
          handleSendMessage(content, parts, sendMessage, block);
        }}
        isStreaming={status === "streaming" || status === "submitted"}
        onStop={stop}
        mcpIndicator={mcpIndicator}
      />
    </>
  );
}
