import { useCallback, useEffect, useState } from "react";
import {
  DangerZone,
  ResourceDetailEmpty,
  ResourcePreviewHeader,
} from "~/shared/ui/resource-list";
import * as main from "~/store/tinybase/store/main";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

type WebShortcut = {
  slug: string;
  title: string;
  description: string;
  category: string;
  targets?: string[];
  prompt: string;
};

export function ChatShortcutDetailsColumn({
  isWebMode,
  selectedMineId,
  selectedWebShortcut,
  setSelectedMineId,
  handleCloneShortcut,
}: {
  isWebMode: boolean;
  selectedMineId: string | null;
  selectedWebShortcut: WebShortcut | null;
  setSelectedMineId: (id: string | null) => void;
  handleCloneShortcut: (shortcut: WebShortcut) => void;
}) {
  if (isWebMode) {
    if (!selectedWebShortcut) {
      return <ResourceDetailEmpty message="Select a shortcut to preview" />;
    }
    return (
      <WebShortcutPreview
        shortcut={selectedWebShortcut}
        onClone={handleCloneShortcut}
      />
    );
  }

  if (!selectedMineId) {
    return <ResourceDetailEmpty message="Select a shortcut to view or edit" />;
  }

  return (
    <ChatShortcutForm
      key={selectedMineId}
      id={selectedMineId}
      setSelectedMineId={setSelectedMineId}
    />
  );
}

function WebShortcutPreview({
  shortcut,
  onClone,
}: {
  shortcut: WebShortcut;
  onClone: (shortcut: WebShortcut) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <ResourcePreviewHeader
        title={shortcut.title}
        description={shortcut.description}
        category={shortcut.category}
        targets={shortcut.targets}
        onClone={() => onClone(shortcut)}
      />

      <div className="flex-1 p-6">
        <h3 className="text-sm font-medium text-neutral-600 mb-3">
          Prompt Content
        </h3>
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">
            {shortcut.prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatShortcutForm({
  id,
  setSelectedMineId,
}: {
  id: string;
  setSelectedMineId: (id: string | null) => void;
}) {
  const title = main.UI.useCell("chat_shortcuts", id, "title", main.STORE_ID);
  const content = main.UI.useCell(
    "chat_shortcuts",
    id,
    "content",
    main.STORE_ID,
  );
  const [localTitle, setLocalTitle] = useState(title || "");
  const [localContent, setLocalContent] = useState(content || "");

  useEffect(() => {
    setLocalTitle(title || "");
    setLocalContent(content || "");
  }, [title, content, id]);

  const handleUpdate = main.UI.useSetPartialRowCallback(
    "chat_shortcuts",
    id,
    (row: { title?: string; content?: string }) => row,
    [id],
    main.STORE_ID,
  );

  const handleDelete = main.UI.useDelRowCallback(
    "chat_shortcuts",
    () => id,
    main.STORE_ID,
  );

  const handleSave = useCallback(() => {
    handleUpdate({ title: localTitle, content: localContent });
  }, [handleUpdate, localTitle, localContent]);

  const handleDeleteClick = useCallback(() => {
    handleDelete();
    setSelectedMineId(null);
  }, [handleDelete, setSelectedMineId]);

  const hasChanges =
    localTitle !== (title || "") || localContent !== (content || "");

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Edit Shortcut</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Create a quick shortcut for chat inputs
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            Title
          </label>
          <Input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="Enter a title for this shortcut..."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            Content
          </label>
          <Textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            placeholder="Enter your chat shortcut content..."
            className="min-h-[200px] resize-none"
          />
        </div>
      </div>

      <div className="p-6 border-t border-neutral-200">
        <DangerZone
          title="Delete this shortcut"
          description="This action cannot be undone"
          buttonLabel="Delete Shortcut"
          onAction={handleDeleteClick}
        />
      </div>
    </div>
  );
}
