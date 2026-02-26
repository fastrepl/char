import { useCallback } from "react";
import { useLanguageModel } from "~/ai/hooks";
import { useShell } from "~/contexts/shell";
import { useTabs } from "~/store/zustand/tabs";

import { cn } from "@hypr/utils";

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
    <div
      className={cn([
        "flex flex-col h-full",
        chat.mode === "RightPanelOpen" &&
          "border border-neutral-200 rounded-xl overflow-hidden",
      ])}
    >
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
