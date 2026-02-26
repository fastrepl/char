import { FolderIcon, FoldersIcon, StickyNoteIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { StandardTabWrapper } from "~/shared/main";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import {
  FolderBreadcrumb,
  useFolderChain,
} from "~/shared/ui/folder-breadcrumb";
import { useSession } from "~/store/tinybase/hooks";
import { sessionOps } from "~/store/tinybase/persister/session/ops";
import * as main from "~/store/tinybase/store/main";
import { type Tab, useTabs } from "~/store/zustand/tabs";

import { cn } from "@hypr/utils";

import { Section } from "./shared";

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

function TabContentFolderTopLevel() {
  const { topLevel: topLevelFolderIds } = useFolderTree();

  return (
    <div className="flex flex-col gap-6">
      <Section icon={<FolderIcon className="w-4 h-4" />} title="Folders">
        {topLevelFolderIds.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {topLevelFolderIds.map((folderId) => (
              <FolderCard key={folderId} folderId={folderId} />
            ))}
          </div>
        )}
      </Section>
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

  return (
    <div
      className={cn([
        "flex flex-col items-center justify-center",
        "gap-2 p-6 border rounded-lg hover:bg-muted cursor-pointer",
      ])}
      onClick={() => {
        if (!isEditing) {
          openCurrent({ type: "folders", id: folderId });
        }
      }}
    >
      <FolderIcon className="w-12 h-12 text-muted-foreground" />
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
        <span
          className="text-sm font-medium text-center"
          onClick={(e) => {
            e.stopPropagation();
            setEditValue(name);
            setIsEditing(true);
          }}
        >
          {name}
        </span>
      )}
      {childCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {childCount} items
        </span>
      )}
    </div>
  );
}

function TabContentFolderSpecific({ folderId }: { folderId: string }) {
  const { byParent } = useFolderTree();
  const childFolderIds = byParent[folderId] || [];

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );

  const isEmpty =
    childFolderIds.length === 0 && (sessionIds?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <TabContentFolderBreadcrumb folderId={folderId} />

      <Section icon={<FolderIcon className="w-4 h-4" />} title="Folders">
        {childFolderIds.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {childFolderIds.map((childId) => (
              <FolderCard key={childId} folderId={childId} />
            ))}
          </div>
        )}
      </Section>

      {!isEmpty && (
        <Section icon={<StickyNoteIcon className="w-4 h-4" />} title="Notes">
          {(sessionIds?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2">
              {sessionIds!.map((sessionId) => (
                <FolderSessionItem key={sessionId} sessionId={sessionId} />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function TabContentFolderBreadcrumb({ folderId }: { folderId: string }) {
  const openCurrent = useTabs((state) => state.openCurrent);

  return (
    <FolderBreadcrumb
      folderId={folderId}
      renderBefore={() => (
        <button
          onClick={() => openCurrent({ type: "folders", id: null })}
          className="hover:text-foreground"
        >
          <FoldersIcon className="w-4 h-4" />
        </button>
      )}
      renderCrumb={({ id, name, isLast }) => (
        <button
          onClick={() => !isLast && openCurrent({ type: "folders", id })}
          className={
            isLast ? "text-foreground font-medium" : "hover:text-foreground"
          }
        >
          {name}
        </button>
      )}
    />
  );
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const openCurrent = useTabs((state) => state.openCurrent);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "sessions", id: sessionId })}
    >
      <StickyNoteIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{session.title || "Untitled"}</span>
    </div>
  );
}
