import { useCallback } from "react";

import { useShell } from "../../contexts/shell";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import { useTabs } from "../../store/zustand/tabs";
import { ChatBody } from "./body";
import { ChatContent } from "./content";
import { ChatHeader } from "./header";
import { ChatSession } from "./session";
import { useChatActions, useStableSessionId } from "./use-chat-actions";

export function ChatView() {
  const { chat } = useShell();
  const { groupId, setGroupId } = chat;
  const { currentTab } = useTabs();

  const currentSessionId =
    currentTab?.type === "sessions" ? currentTab.id : undefined;

  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel("chat");

  const { handleSendMessage } = useChatActions({
    groupId,
    onGroupCreated: setGroupId,
  });

  const handleNewChat = useCallback(() => {
    setGroupId(undefined);
  }, [setGroupId]);

  const handleSelectChat = useCallback(
    (selectedGroupId: string) => {
      setGroupId(selectedGroupId);
    },
    [setGroupId],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        currentChatGroupId={groupId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        handleClose={() => chat.sendEvent({ type: "CLOSE" })}
      />
      <div className="bg-sky-100 text-neutral-900 text-[11px] px-3 py-1.5">
        Chat is Experimental and under active development
      </div>
      <ChatSession
        key={stableSessionId}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        currentSessionId={currentSessionId}
      >
        {(sessionProps) => (
          <ChatContent
            {...sessionProps}
            model={model}
            handleSendMessage={handleSendMessage}
          >
            <ChatBody
              messages={sessionProps.messages}
              status={sessionProps.status}
              error={sessionProps.error}
              onReload={sessionProps.regenerate}
              isModelConfigured={!!model}
            />
          </ChatContent>
        )}
      </ChatSession>
    </div>
  );
}
