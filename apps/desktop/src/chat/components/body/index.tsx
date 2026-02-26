import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import type { HyprUIMessage } from "~/chat/types";

import { ChatBodyEmpty } from "./empty";
import { ChatBodyNonEmpty } from "./non-empty";

export function ChatBody({
  messages,
  status,
  error,
  onReload,
  isModelConfigured = true,
}: {
  messages: HyprUIMessage[];
  status: ChatStatus;
  error?: Error;
  onReload?: () => void;
  isModelConfigured?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, error]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col">
      <div className="flex-1" />
      {messages.length === 0 ? (
        <ChatBodyEmpty isModelConfigured={isModelConfigured} />
      ) : (
        <ChatBodyNonEmpty
          messages={messages}
          status={status}
          error={error}
          onReload={onReload}
        />
      )}
    </div>
  );
}
