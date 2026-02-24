import { CircleArrowUpIcon, SquareIcon } from "lucide-react";
import { useRef } from "react";

import type { TiptapEditor } from "@hypr/tiptap/chat";
import ChatEditor from "@hypr/tiptap/chat";
import type { PlaceholderFunction } from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useShell } from "../../../contexts/shell";
import {
  useAutoFocusEditor,
  useDraftState,
  useSlashCommandConfig,
  useSubmit,
} from "./hooks";
import { type McpIndicator, McpIndicatorBadge } from "./mcp";

export type { McpIndicator } from "./mcp";

export function ChatMessageInput({
  draftKey,
  onSendMessage,
  disabled: disabledProp,
  isStreaming,
  onStop,
  mcpIndicator,
}: {
  draftKey: string;
  onSendMessage: (
    content: string,
    parts: Array<{ type: "text"; text: string }>,
  ) => void;
  disabled?: boolean | { disabled: boolean; message?: string };
  isStreaming?: boolean;
  onStop?: () => void;
  mcpIndicator?: McpIndicator;
}) {
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const disabled =
    typeof disabledProp === "object" ? disabledProp.disabled : disabledProp;

  const { hasContent, initialContent, handleEditorUpdate } = useDraftState({
    draftKey,
  });
  const handleSubmit = useSubmit({
    draftKey,
    editorRef,
    disabled,
    onSendMessage,
  });
  useAutoFocusEditor({ editorRef, disabled });
  const slashCommandConfig = useSlashCommandConfig();

  return (
    <Container>
      <div className="flex flex-col px-3 pt-3 pb-2">
        <div className="flex-1 mb-1">
          <ChatEditor
            ref={editorRef}
            editable={!disabled}
            initialContent={initialContent}
            placeholderComponent={ChatPlaceholder}
            slashCommandConfig={slashCommandConfig}
            onUpdate={handleEditorUpdate}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="flex items-center justify-between">
          {mcpIndicator ? (
            <McpIndicatorBadge indicator={mcpIndicator} />
          ) : (
            <div />
          )}
          {isStreaming ? (
            <Button
              onClick={onStop}
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
            >
              <SquareIcon size={14} className="fill-current" />
            </Button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className={cn([
                "flex items-center justify-center h-7 w-7 rounded-full transition-colors",
                disabled
                  ? "text-neutral-300 cursor-default"
                  : "text-neutral-400 hover:text-neutral-600",
              ])}
            >
              <CircleArrowUpIcon size={22} />
            </button>
          )}
        </div>
      </div>
      {hasContent && (
        <span className="absolute bottom-1.5 right-5 text-[8px] text-neutral-400">
          Enter to send, Shift + Enter for new line
        </span>
      )}
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  const { chat } = useShell();

  return (
    <div
      className={cn([
        "relative",
        chat.mode !== "RightPanelOpen" && "px-2 pb-2",
      ])}
    >
      <div
        className={cn([
          "flex flex-col border border-neutral-200 rounded-xl",
          chat.mode === "RightPanelOpen" && "rounded-t-none border-t-0",
        ])}
      >
        {children}
      </div>
    </div>
  );
}

const ChatPlaceholder: PlaceholderFunction = ({ node, pos }) => {
  "use no memo";
  if (node.type.name === "paragraph" && pos === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Ask & search about anything, or be creative!
      </p>
    );
  }
  return "";
};
