import {
  FolderIcon,
  FolderPlusIcon,
  FoldersIcon,
  PencilIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";

import { useSession } from "../../../../hooks/tinybase";
import { sessionOps } from "../../../../store/tinybase/persister/session/ops";
import * as main from "../../../../store/tinybase/store/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { FolderBreadcrumb, useFolderChain } from "../shared/folder-breadcrumb";

function useFolderTree() {
  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  return useMemo(() => {
    if (!store || !sessionIds)
      return {
        topLevel: [] as string[],
        byParent: {} as Record<string, string[]>,
      };

    const allFolders = new Set<string>();
    for (const id of sessionIds) {
      const folderId = store.getCell("sessions", id, "folder_id") as string;
      if (folderId) {
        const parts = folderId.split("/");
        for (let i = 1; i <= parts.length; i++) {
          allFolders.add(parts.slice(0, i).join("/"));
        }
      }
    }

    const topLevel: string[] = [];
    const byParent: Record<string, string[]> = {};

    for (const folder of allFolders) {
      const parts = folder.split("/");
      if (parts.length === 1) {
        topLevel.push(folder);
      } else {
        const parent = parts.slice(0, -1).join("/");
        byParent[parent] = byParent[parent] || [];
        byParent[parent].push(folder);
      }
    }

    return { topLevel: topLevel.sort(), byParent };
  }, [sessionIds, store]);
}

function useFolderName(folderId: string) {
  return useMemo(() => {
    const parts = folderId.split("/");
    return parts[parts.length - 1] || "Untitled";
  }, [folderId]);
}

export const TabItemFolder: TabItem<Extract<Tab, { type: "folders" }>> = (
  props,
) => {
  if (props.tab.type === "folders" && props.tab.id === null) {
    return <TabItemFolderAll {...props} />;
  }

  if (props.tab.type === "folders" && props.tab.id !== null) {
    return <TabItemFolderSpecific {...props} />;
  }

  return null;
};

const TabItemFolderAll: TabItem<Extract<Tab, { type: "folders" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseAll,
  handleCloseOthers,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<FoldersIcon className="w-4 h-4" />}
      title={"Folders"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

const TabItemFolderSpecific: TabItem<Extract<Tab, { type: "folders" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  const folderId = tab.id!;
  const folders = useFolderChain(folderId);
  const name = useFolderName(folderId);
  const repeatCount = Math.max(0, folders.length - 1);
  const title = " .. / ".repeat(repeatCount) + name;

  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={title}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentFolder({ tab }: { tab: Tab }) {
  if (tab.type !== "folders") {
    return null;
  }

  return (
    <StandardTabWrapper>
      {tab.id === null ? (
        <TabContentFolderTopLevel />
      ) : (
        <TabContentFolderSpecific folderId={tab.id} />
      )}
    </StandardTabWrapper>
  );
}

function FolderToolbar({
  title,
  parentFolderId,
  breadcrumb,
}: {
  title: string;
  parentFolderId?: string;
  breadcrumb?: ReactNode;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreate = async () => {
    const name = newFolderName.trim();
    if (!name) {
      setIsCreating(false);
      setNewFolderName("");
      return;
    }

    const result = await sessionOps.createFolder(name, parentFolderId);
    if (result.status === "error") {
      console.error("[FolderView] createFolder failed:", result.error);
    }
    setIsCreating(false);
    setNewFolderName("");
  };

  return (
    <div
      className={cn([
        "flex items-center justify-between",
        "px-2 pt-1 pb-1 border-b border-neutral-200",
      ])}
    >
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb || (
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isCreating ? (
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewFolderName("");
              }
            }}
            autoFocus
            placeholder="Folder name"
            className="text-sm border border-neutral-200 rounded-md px-2 py-1 w-40 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
          />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCreating(true)}
          >
            <FolderPlusIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function TabContentFolderTopLevel() {
  const { topLevel: topLevelFolderIds } = useFolderTree();

  return (
    <div className="flex flex-col h-full">
      <FolderToolbar title="Folders" />
      <div className="flex-1 overflow-y-auto p-3">
        {topLevelFolderIds.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {topLevelFolderIds.map((folderId) => (
              <FolderCard key={folderId} folderId={folderId} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <FoldersIcon className="w-12 h-12 mb-3" />
            <p className="text-sm">No folders yet</p>
            <p className="text-xs mt-1">
              Click the + button above to create one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderCard({ folderId }: { folderId: string }) {
  const name = useFolderName(folderId);
  const openCurrent = useTabs((state) => state.openCurrent);
  const { byParent } = useFolderTree();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

  const childFolderIds = byParent[folderId] || [];

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );

  const childCount = childFolderIds.length + (sessionIds?.length ?? 0);

  const handleRename = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === name) {
      setEditValue(name);
      setIsEditing(false);
      return;
    }

    const parts = folderId.split("/");
    parts[parts.length - 1] = trimmed;
    const newFolderId = parts.join("/");

    const result = await sessionOps.renameFolder(folderId, newFolderId);
    if (result.status === "error") {
      setEditValue(name);
    }
    setIsEditing(false);
  }, [editValue, name, folderId]);

  const handleDelete = useCallback(async () => {
    const result = await sessionOps.deleteFolder(folderId);
    if (result.status === "error") {
      console.error("[FolderView] deleteFolder failed:", result.error);
    }
  }, [folderId]);

  const cardContent = (
    <div
      className={cn([
        "flex flex-col items-center justify-center",
        "gap-1.5 p-4 border border-neutral-200 rounded-lg",
        "hover:bg-neutral-50 cursor-pointer transition-colors",
      ])}
      onClick={() => {
        if (!isEditing) {
          openCurrent({ type: "folders", id: folderId });
        }
      }}
    >
      <FolderIcon className="w-10 h-10 text-neutral-400" />
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleRename();
            } else if (e.key === "Escape") {
              setEditValue(name);
              setIsEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className={cn([
            "text-sm font-medium text-center w-full",
            "border-none bg-transparent focus:outline-hidden focus:underline",
          ])}
        />
      ) : (
        <span className="text-sm font-medium text-center text-neutral-900 truncate w-full">
          {name}
        </span>
      )}
      <span className="text-xs text-neutral-400">
        {childCount} {childCount === 1 ? "item" : "items"}
      </span>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => {
            setEditValue(name);
            setIsEditing(true);
          }}
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2Icon className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function TabContentFolderSpecific({ folderId }: { folderId: string }) {
  const { byParent } = useFolderTree();
  const childFolderIds = byParent[folderId] || [];
  const openCurrent = useTabs((state) => state.openCurrent);

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );

  const isEmpty =
    childFolderIds.length === 0 && (sessionIds?.length ?? 0) === 0;

  const breadcrumb = (
    <FolderBreadcrumb
      folderId={folderId}
      renderBefore={() => (
        <button
          onClick={() => openCurrent({ type: "folders", id: null })}
          className="text-neutral-500 hover:text-neutral-900"
        >
          <FoldersIcon className="w-4 h-4" />
        </button>
      )}
      renderCrumb={({ id, name, isLast }) => (
        <button
          onClick={() => !isLast && openCurrent({ type: "folders", id })}
          className={cn([
            "text-sm",
            isLast
              ? "text-neutral-900 font-semibold"
              : "text-neutral-500 hover:text-neutral-900",
          ])}
        >
          {name}
        </button>
      )}
    />
  );

  return (
    <div className="flex flex-col h-full">
      <FolderToolbar
        title=""
        parentFolderId={folderId}
        breadcrumb={breadcrumb}
      />
      <div className="flex-1 overflow-y-auto p-3">
        {childFolderIds.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2 px-1">
              Folders
            </div>
            <div className="grid grid-cols-4 gap-3">
              {childFolderIds.map((childId) => (
                <FolderCard key={childId} folderId={childId} />
              ))}
            </div>
          </div>
        )}

        {(sessionIds?.length ?? 0) > 0 && (
          <div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2 px-1">
              Notes
            </div>
            <div className="flex flex-col gap-1">
              {sessionIds!.map((sessionId) => (
                <FolderSessionItem key={sessionId} sessionId={sessionId} />
              ))}
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <FolderIcon className="w-12 h-12 mb-3" />
            <p className="text-sm">This folder is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const openCurrent = useTabs((state) => state.openCurrent);

  const handleRemoveFromFolder = useCallback(async () => {
    const result = await sessionOps.removeSessionFromFolder(sessionId);
    if (result.status === "error") {
      console.error(
        "[FolderView] removeSessionFromFolder failed:",
        result.error,
      );
    }
  }, [sessionId]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn([
            "flex items-center gap-2 px-3 py-2 rounded-md",
            "hover:bg-neutral-50 cursor-pointer transition-colors",
          ])}
          onClick={() => openCurrent({ type: "sessions", id: sessionId })}
        >
          <StickyNoteIcon className="w-4 h-4 text-neutral-400" />
          <span className="text-sm text-neutral-900">
            {session.title || "Untitled"}
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={handleRemoveFromFolder}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2Icon className="w-4 h-4 mr-2" />
          Remove from folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
