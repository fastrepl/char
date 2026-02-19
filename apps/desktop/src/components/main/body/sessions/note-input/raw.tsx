import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import NoteEditor, {
  type JSONContent,
  type TiptapEditor,
} from "@hypr/tiptap/editor";
import {
  parseJsonContent,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";

import { useSearchEngine } from "../../../../../contexts/search/engine";
import { useImageUpload } from "../../../../../hooks/useImageUpload";
import * as main from "../../../../../store/tinybase/store/main";

export const RawEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string; onNavigateToTitle?: () => void }
>(({ sessionId, onNavigateToTitle }, ref) => {
  const rawMd = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);
  const onImageUpload = useImageUpload(sessionId);

  const initialContent = useMemo<JSONContent>(
    () => parseJsonContent(rawMd as string),
    [rawMd],
  );

  const persistChange = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: JSONContent) => ({ raw_md: JSON.stringify(input) }),
    [],
    main.STORE_ID,
  );

  const hasTrackedWriteRef = useRef(false);

  useEffect(() => {
    hasTrackedWriteRef.current = false;
  }, [sessionId]);

  const hasNonEmptyText = useCallback(
    (node?: JSONContent): boolean =>
      !!node?.text?.trim() ||
      !!node?.content?.some((child: JSONContent) => hasNonEmptyText(child)),
    [],
  );

  const handleChange = useCallback(
    (input: JSONContent) => {
      persistChange(input);

      if (!hasTrackedWriteRef.current) {
        const hasContent = hasNonEmptyText(input);
        if (hasContent) {
          hasTrackedWriteRef.current = true;
          void analyticsCommands.event({
            event: "note_edited",
            has_content: true,
          });
        }
      }
    },
    [persistChange, hasNonEmptyText],
  );

  const { search } = useSearchEngine();

  const mentionConfig = useMemo(
    () => ({
      trigger: "@",
      handleSearch: async (query: string) => {
        const results = await search(query);
        return results.slice(0, 5).map((hit) => ({
          id: hit.document.id,
          type: hit.document.type,
          label: hit.document.title,
        }));
      },
    }),
    [search],
  );

  const fileHandlerConfig = useMemo(() => ({ onImageUpload }), [onImageUpload]);

  return (
    <NoteEditor
      ref={ref}
      key={`session-${sessionId}-raw`}
      initialContent={initialContent}
      handleChange={handleChange}
      mentionConfig={mentionConfig}
      placeholderComponent={Placeholder}
      onNavigateToTitle={onNavigateToTitle}
      fileHandlerConfig={fileHandlerConfig}
    />
  );
});

const Placeholder: PlaceholderFunction = ({ node, pos }) => {
  "use no memo";
  if (node.type.name === "paragraph" && pos === 0) {
    return (
      <p className="text-[#e5e5e5]">
        Take notes or press <kbd>/</kbd> for commands.
      </p>
    );
  }

  return "";
};
