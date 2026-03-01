import { MessageSquareIcon, SparklesIcon } from "lucide-react";
import { useCallback } from "react";

import { useTabs } from "~/store/zustand/tabs";

export function ChatBodyEmpty({
  isModelConfigured = true,
}: {
  isModelConfigured?: boolean;
}) {
  const openNew = useTabs((state) => state.openNew);

  const handleGoToSettings = useCallback(() => {
    openNew({ type: "ai", state: { tab: "intelligence" } });
  }, [openNew]);

  const handleOpenChatShortcuts = useCallback(() => {
    openNew({ type: "ai", state: { tab: "shortcuts" } });
  }, [openNew]);

  const handleOpenPrompts = useCallback(() => {
    openNew({ type: "ai", state: { tab: "prompts" } });
  }, [openNew]);

  if (!isModelConfigured) {
    return (
      <div className="flex justify-start px-3 py-2 pb-4">
        <div className="flex max-w-[80%] min-w-[240px] flex-col">
          <div className="mb-2 flex items-center gap-2">
            <img src="/assets/dynamic.gif" alt="Char" className="h-5 w-5" />
            <span className="text-sm font-medium text-neutral-800">
              Char AI
            </span>
          </div>
          <p className="mb-2 text-sm text-neutral-700">
            Hey! I need you to configure a language model to start chatting with
            me!
          </p>
          <button
            onClick={handleGoToSettings}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <SparklesIcon size={12} />
            Open AI Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-3 pb-4">
      <div className="flex max-w-[80%] min-w-[240px] flex-col">
        <div className="mb-2 flex items-center gap-1">
          <img src="/assets/dynamic.gif" alt="Char" className="h-5 w-5" />
          <span className="text-sm font-medium text-neutral-800">Char AI</span>
        </div>
        <p className="mb-2 text-sm text-neutral-700">
          Hey! I can help you with a lot of cool stuff :)
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={handleOpenChatShortcuts}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <MessageSquareIcon size={12} />
            Shortcuts
          </button>
          <button
            onClick={handleOpenPrompts}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <SparklesIcon size={12} />
            Prompts
          </button>
        </div>
      </div>
    </div>
  );
}
