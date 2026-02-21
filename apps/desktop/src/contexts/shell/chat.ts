import { useChatContext } from "../../store/zustand/chat-context";
import { useTabs } from "../../store/zustand/tabs";

export type { ChatEvent, ChatMode } from "../../store/zustand/tabs";

export function useChatMode() {
  const mode = useTabs((state) => state.chatMode);
  const transitionChatMode = useTabs((state) => state.transitionChatMode);

  const groupId = useChatContext((state) => state.groupId);
  const setGroupId = useChatContext((state) => state.setGroupId);

  return {
    mode,
    sendEvent: transitionChatMode,
    groupId,
    setGroupId,
  };
}
