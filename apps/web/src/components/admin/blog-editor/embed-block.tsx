import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { CodeIcon, PencilIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { EmbedBlockNode as BaseEmbedBlockNode } from "@hypr/tiptap/shared";

function EmbedBlockNodeView({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.content);
  const [inputValue, setInputValue] = useState(node.attrs.content || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInputValue(node.attrs.content || "");
  }, [node.attrs.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSubmit = useCallback(() => {
    const code = inputValue.trim();
    if (!code) return;
    updateAttributes({ content: code });
    setIsEditing(false);
  }, [inputValue, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (node.attrs.content) {
          setInputValue(node.attrs.content);
          setIsEditing(false);
        }
      }
      if (e.key === "Backspace" && !inputValue && !node.attrs.content) {
        e.preventDefault();
        deleteNode();
      }
    },
    [handleSubmit, node.attrs.content, inputValue, deleteNode],
  );

  if (isEditing || !node.attrs.content) {
    return (
      <NodeViewWrapper>
        <div className="my-4 border border-dashed border-neutral-300 rounded-md bg-neutral-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 border-b border-neutral-200">
            <CodeIcon className="size-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-500 font-medium">
              Embed Block
            </span>
            <span className="text-xs text-neutral-400">
              Paste iframe, JSX, or HTML
            </span>
          </div>
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder={
                '<iframe src="..." />\n<CtaCard />\n<Callout type="note">...</Callout>'
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-neutral-200 rounded resize-none focus:outline-none focus:border-blue-500 min-h-[80px]"
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-400">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to
                save · Esc to cancel
              </span>
              <div className="flex gap-2">
                {node.attrs.content && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue(node.attrs.content);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const preview = getPreviewLabel(node.attrs.content);

  return (
    <NodeViewWrapper>
      <div
        className={[
          "my-4 border rounded-md overflow-hidden group",
          selected ? "border-blue-500" : "border-neutral-200",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <CodeIcon className="size-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-600 font-medium">
              {preview.label}
            </span>
            {preview.detail && (
              <span className="text-xs text-neutral-400">{preview.detail}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-200"
            title="Edit embed code"
          >
            <PencilIcon className="size-3.5 text-neutral-500" />
          </button>
        </div>
        <div className="p-3 bg-white">
          <pre className="text-xs font-mono text-neutral-600 whitespace-pre-wrap break-all leading-relaxed max-h-[200px] overflow-y-auto">
            {node.attrs.content}
          </pre>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function getPreviewLabel(content: string): {
  label: string;
  detail?: string;
} {
  const trimmed = content.trim();

  const iframeMatch = trimmed.match(/<iframe[^>]*src="([^"]*)"[^>]*>/i);
  if (iframeMatch) {
    try {
      const url = new URL(iframeMatch[1]);
      return { label: "iframe", detail: url.hostname };
    } catch {
      return { label: "iframe" };
    }
  }

  const jsxMatch = trimmed.match(/^<([A-Z][A-Za-z0-9]*)/);
  if (jsxMatch) {
    return { label: "JSX Component", detail: `<${jsxMatch[1]} />` };
  }

  const htmlMatch = trimmed.match(/^<([a-z][a-z0-9-]*)/i);
  if (htmlMatch) {
    return { label: "HTML", detail: `<${htmlMatch[1]}>` };
  }

  return { label: "Embed Block" };
}

export const EmbedBlockNode = BaseEmbedBlockNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EmbedBlockNodeView);
  },
});
