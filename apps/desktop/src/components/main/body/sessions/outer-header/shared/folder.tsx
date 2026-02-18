import { CornerDownLeft } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/utils";

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

type FolderOption =
  | { type: "create"; name: string }
  | { type: "folder"; folderId: string; name: string };

function SearchableFolderContent({
  folders,
  onSelectFolder,
  setOpen,
}: {
  folders: Record<string, { name: string }>;
  onSelectFolder: (folderId: string) => Promise<void>;
  setOpen?: (open: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const folderEntries = useMemo(() => Object.entries(folders), [folders]);

  const filteredFolders = useMemo(() => {
    if (!inputValue.trim()) return folderEntries;
    const search = inputValue.toLowerCase();
    return folderEntries.filter(([, folder]) =>
      folder.name.toLowerCase().includes(search),
    );
  }, [folderEntries, inputValue]);

  const hasExactMatch = filteredFolders.some(
    ([, folder]) =>
      folder.name.toLowerCase() === inputValue.trim().toLowerCase(),
  );
  const showCreateOption = inputValue.trim().length > 0 && !hasExactMatch;

  const options: FolderOption[] = useMemo(() => {
    const result: FolderOption[] = [];
    if (showCreateOption) {
      result.push({ type: "create", name: inputValue.trim() });
    }
    for (const [folderId, folder] of filteredFolders) {
      result.push({ type: "folder", folderId, name: folder.name });
    }
    return result;
  }, [filteredFolders, showCreateOption, inputValue]);

  useEffect(() => {
    if (selectedIndex >= options.length) {
      setSelectedIndex(Math.max(0, options.length - 1));
    }
  }, [options.length, selectedIndex]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[selectedIndex] as HTMLElement;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelectOption = async (option: FolderOption) => {
    if (option.type === "create") {
      const result = await sessionOps.createFolder(option.name);
      if (result.status === "ok") {
        await onSelectFolder(result.folderId);
        setOpen?.(false);
      }
    } else {
      await onSelectFolder(option.folderId);
      setOpen?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return;
    e.stopPropagation();

    if (e.key === "Enter" && options.length > 0) {
      e.preventDefault();
      handleSelectOption(options[selectedIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

  return (
    <div className="flex flex-col">
      <input
        type="text"
        className="w-full bg-transparent outline-hidden text-sm placeholder:text-neutral-400 px-3 py-2"
        placeholder="Search or create folder..."
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setSelectedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {options.length > 0 && (
        <>
          <div className="h-px bg-neutral-200" />
          <div ref={listRef} className="max-h-50 overflow-auto py-1">
            {options.map((option, index) => (
              <button
                key={option.type === "create" ? "new" : option.folderId}
                type="button"
                tabIndex={-1}
                className={cn([
                  "w-full px-3 py-1.5 text-left text-sm",
                  selectedIndex === index
                    ? "bg-neutral-100"
                    : "hover:bg-neutral-50",
                ])}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="flex items-center justify-between w-full">
                  {option.type === "create" ? (
                    <span>
                      Create "<span className="font-medium">{option.name}</span>
                      "
                    </span>
                  ) : (
                    <span className="font-medium">{option.name}</span>
                  )}
                  {selectedIndex === index && (
                    <CornerDownLeft className="size-3 text-muted-foreground" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {options.length === 0 && !inputValue.trim() && (
        <>
          <div className="h-px bg-neutral-200" />
          <div className="px-3 py-2 text-sm text-neutral-400">
            Type to create a new folder
          </div>
        </>
      )}
    </div>
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
