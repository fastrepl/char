import { FolderIcon, FolderPlusIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@hypr/ui/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

import { sessionOps } from "../../../../../../store/tinybase/persister/session/ops";
import * as main from "../../../../../../store/tinybase/store/main";

function useFolders() {
  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  return useMemo(() => {
    if (!store || !sessionIds) return {};

    const folders: Record<string, { name: string }> = {};
    for (const id of sessionIds) {
      const folderId = store.getCell("sessions", id, "folder_id") as string;
      if (folderId && !folders[folderId]) {
        const parts = folderId.split("/");
        folders[folderId] = { name: parts[parts.length - 1] };
      }
    }
    return folders;
  }, [sessionIds, store]);
}

export function SearchableFolderDropdown({
  sessionId,
  trigger,
}: {
  sessionId: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const folders = useFolders();

  const handleSelectFolder = useMoveSessionToFolder(sessionId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-50 p-0">
        <SearchableFolderContent
          folders={folders}
          onSelectFolder={handleSelectFolder}
          setOpen={setOpen}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchableFolderSubmenuContent({
  sessionId,
  setOpen,
}: {
  sessionId: string;
  setOpen?: (open: boolean) => void;
}) {
  const folders = useFolders();

  const handleSelectFolder = useMoveSessionToFolder(sessionId);

  return (
    <DropdownMenuSubContent className="w-50 p-0">
      <SearchableFolderContent
        folders={folders}
        onSelectFolder={handleSelectFolder}
        setOpen={setOpen}
      />
    </DropdownMenuSubContent>
  );
}

function SearchableFolderContent({
  folders,
  onSelectFolder,
  setOpen,
}: {
  folders: Record<string, { name: string }>;
  onSelectFolder: (folderId: string) => Promise<void>;
  setOpen?: (open: boolean) => void;
}) {
  const [searchValue, setSearchValue] = useState("");

  const handleSelect = async (folderId: string) => {
    await onSelectFolder(folderId);
    setOpen?.(false);
  };

  const handleCreateAndSelect = async () => {
    const name = searchValue.trim();
    if (!name) return;

    const result = await sessionOps.createFolder(name);
    if (result.status === "ok") {
      await onSelectFolder(result.folderId);
      setOpen?.(false);
    }
  };

  const folderEntries = Object.entries(folders);
  const hasExactMatch = folderEntries.some(
    ([, folder]) =>
      folder.name.toLowerCase() === searchValue.trim().toLowerCase(),
  );
  const showCreateOption = searchValue.trim().length > 0 && !hasExactMatch;

  return (
    <Command>
      <CommandInput
        placeholder="Search or create folder..."
        autoFocus
        className="h-9"
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>
          {searchValue.trim() ? (
            <button
              onClick={handleCreateAndSelect}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
            >
              <FolderPlusIcon className="w-4 h-4" />
              <span>Create "{searchValue.trim()}"</span>
            </button>
          ) : (
            "Type to create a new folder"
          )}
        </CommandEmpty>
        {folderEntries.length > 0 && (
          <CommandGroup>
            {folderEntries.map(([folderId, folder]) => (
              <CommandItem
                key={folderId}
                value={folder.name}
                onSelect={() => handleSelect(folderId)}
              >
                <FolderIcon />
                {folder.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {showCreateOption && folderEntries.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateAndSelect}>
                <FolderPlusIcon />
                Create "{searchValue.trim()}"
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}

function useMoveSessionToFolder(sessionId: string) {
  return useCallback(
    async (targetFolderId: string) => {
      const result = await sessionOps.moveSessionToFolder(
        sessionId,
        targetFolderId,
      );
      if (result.status === "error") {
        console.error("[MoveSession] Failed:", result.error);
      }
    },
    [sessionId],
  );
}
