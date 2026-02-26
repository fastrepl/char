import { useCallback } from "react";
import { useShell } from "~/contexts/shell";
import { useAutoCloser } from "~/shared/hooks/useAutoCloser";

import { InteractiveContainer } from "./interactive";
import { ChatTrigger } from "./trigger";
import { ChatView } from "./view";

export function ChatFloatingButton({
  isCaretNearBottom = false,
  showTimeline = false,
}: {
  isCaretNearBottom?: boolean;
  showTimeline?: boolean;
}) {
  const { chat } = useShell();
  const isOpen = chat.mode === "FloatingOpen";

  useAutoCloser(() => chat.sendEvent({ type: "CLOSE" }), {
    esc: isOpen,
    outside: false,
  });

  const handleClickTrigger = useCallback(async () => {
    chat.sendEvent({ type: "OPEN" });
  }, [chat]);

  if (!isOpen) {
    return (
      <ChatTrigger
        onClick={handleClickTrigger}
        isCaretNearBottom={isCaretNearBottom}
        showTimeline={showTimeline}
      />
    );
  }

  return (
    <InteractiveContainer width={400} height={window.innerHeight * 0.7}>
      <ChatView />
    </InteractiveContainer>
  );
}
