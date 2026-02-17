import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  type Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { getExtensions, type ImageUploadResult } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";

import "./blog-editor.css";
import { ClipNode } from "./clip-embed";
import { GoogleDocsImport } from "./google-docs-import";
import { BlogImage } from "./image-with-alt";
import { Toolbar } from "./toolbar";

export type { TiptapEditor };

interface BlogEditorProps {
  content?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  showToolbar?: boolean;
  onGoogleDocsImport?: (url: string) => void;
  isImporting?: boolean;
  onImageUpload?: (file: File) => Promise<ImageUploadResult>;
  onAddImageFromLibrary?: () => void;
}

const BlogEditor = forwardRef<{ editor: TiptapEditor | null }, BlogEditorProps>(
  (props, ref) => {
    const {
      content = "",
      onChange,
      editable = true,
      showToolbar = true,
      onGoogleDocsImport,
      isImporting,
      onImageUpload,
      onAddImageFromLibrary,
    } = props;
    const [showSearch, setShowSearch] = useState(false);
    const [showReplace, setShowReplace] = useState(false);

    const onUpdate = useDebounceCallback(
      ({ editor }: { editor: TiptapEditor }) => {
        if (!editor.isInitialized || !onChange) {
          return;
        }
        const json = editor.getJSON();
        const markdown = editor.markdown?.serialize(json);
        if (markdown) {
          onChange(markdown);
        }
      },
      300,
    );

    const extensions = useMemo(
      () => [
        ...getExtensions(
          ({ node }) => {
            if (node.type.name === "paragraph") {
              return "Start typing...";
            }
            return "";
          },
          onImageUpload
            ? {
                onImageUpload,
              }
            : undefined,
          { imageExtension: BlogImage },
        ),
        Markdown,
        ClipNode,
      ],
      [onImageUpload],
    );

    const editor = useEditor(
      {
        extensions,
        editable,
        content,
        contentType: "markdown",
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", "false");
        },
        onUpdate,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
      },
      [extensions],
    );

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor, ref]);

    useEffect(() => {
      if (editor && !editor.isFocused && content !== undefined) {
        const json = editor.getJSON();
        const currentMarkdown = editor.markdown?.serialize(json) || "";
        if (currentMarkdown !== content) {
          queueMicrotask(() => {
            editor.commands.setContent(content, { contentType: "markdown" });
          });
        }
      }
    }, [editor, content]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        const isMod = e.metaKey || e.ctrlKey;

        if (isMod && e.key === "f") {
          e.preventDefault();
          setShowSearch((prev) => !prev);
          if (!showSearch) {
            setShowReplace(false);
          }
        }

        if (isMod && e.shiftKey && e.key === "h") {
          e.preventDefault();
          if (showSearch) {
            setShowReplace((prev) => !prev);
          } else {
            setShowSearch(true);
            setShowReplace(true);
          }
        }
      },
      [showSearch],
    );

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const showImportOverlay = editor?.isEmpty && onGoogleDocsImport && editable;

    useEffect(() => {
      const platform = navigator.platform.toLowerCase();
      if (platform.includes("win")) {
        document.body.classList.add("platform-windows");
      } else if (platform.includes("linux")) {
        document.body.classList.add("platform-linux");
      }

      return () => {
        document.body.classList.remove("platform-windows", "platform-linux");
      };
    }, []);

    return (
      <div className="relative flex flex-col h-full">
        {editable && showToolbar && (
          <div className="shrink-0">
            <Toolbar
              editor={editor}
              onAddImage={onAddImageFromLibrary}
              showSearch={showSearch}
              onShowSearchChange={setShowSearch}
              showReplace={showReplace}
              onShowReplaceChange={setShowReplace}
            />
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <EditorContent
            editor={editor}
            className="tiptap-root blog-editor"
            role="textbox"
          />
          {showImportOverlay && (
            <div className="mt-6">
              <GoogleDocsImport
                onImport={onGoogleDocsImport}
                isLoading={isImporting}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

BlogEditor.displayName = "BlogEditor";

export default BlogEditor;
