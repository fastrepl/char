import { forwardRef, useMemo } from "react";

import { type JSONContent, TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import { parseJsonContent } from "@hypr/tiptap/shared";

import { useSearchEngine } from "../../../../../../contexts/search/engine";
import { useImageUpload } from "../../../../../../hooks/useImageUpload";
import * as main from "../../../../../../store/tinybase/store/main";

export const EnhancedEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string; enhancedNoteId: string; onNavigateToTitle?: () => void }
>(({ sessionId, enhancedNoteId, onNavigateToTitle }, ref) => {
  const onImageUpload = useImageUpload(sessionId);
  const content = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "content",
    main.STORE_ID,
  );

  const initialContent = useMemo<JSONContent>(
    () => parseJsonContent(content as string),
    [content],
  );

  const handleChange = main.UI.useSetPartialRowCallback(
    "enhanced_notes",
    enhancedNoteId,
    (input: JSONContent) => ({ content: JSON.stringify(input) }),
    [],
    main.STORE_ID,
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
    <div className="h-full">
      <NoteEditor
        ref={ref}
        key={`enhanced-note-${enhancedNoteId}`}
        initialContent={initialContent}
        handleChange={handleChange}
        mentionConfig={mentionConfig}
        onNavigateToTitle={onNavigateToTitle}
        fileHandlerConfig={fileHandlerConfig}
      />
    </div>
  );
});
