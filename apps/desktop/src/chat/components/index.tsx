import { useCallback } from "react";
import { useShell } from "~/contexts/shell";

import { ChatTrigger } from "./trigger";

export function ChatFloatingButton({
  isCaretNearBottom = false,
  showTimeline = false,
}: {
  isCaretNearBottom?: boolean;
  showTimeline?: boolean;
}) {
  const { chat } = useShell();
  const isOpen = chat.mode === "FloatingOpen";

  const handleClickTrigger = useCallback(async () => {
    chat.sendEvent({ type: "OPEN" });
  }, [chat]);

  if (isOpen) {
    return null;
  }

  return (
    <ChatTrigger
      onClick={handleClickTrigger}
      isCaretNearBottom={isCaretNearBottom}
      showTimeline={showTimeline}
    />
  );
}
