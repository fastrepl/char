import { useQuery } from "@tanstack/react-query";
import { Blocks, FolderOpen, RefreshCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { ExtensionInfo } from "@hypr/plugin-extensions";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import {
  getExtensionsDir,
  listInstalledExtensions,
  loadExtensionPanels,
} from "./registry";

export function ExtensionsListColumn({
  selectedExtension,
  setSelectedExtension,
}: {
  selectedExtension: string | null;
  setSelectedExtension: (id: string | null) => void;
}) {
  const [searchValue, setSearchValue] = useState("");

  const { data: extensions = [], refetch } = useQuery({
    queryKey: ["extensions", "list"],
    queryFn: async () => {
      await loadExtensionPanels();
      return listInstalledExtensions();
    },
  });

  const filteredExtensions = useMemo(() => {
    if (!searchValue.trim()) {
      return extensions;
    }
    const q = searchValue.toLowerCase();
    return extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(q) ||
        ext.id.toLowerCase().includes(q) ||
        ext.description?.toLowerCase().includes(q),
    );
  }, [extensions, searchValue]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleOpenDir = async () => {
    const dir = await getExtensionsDir();
    if (dir) {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(dir);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <ExtensionColumnHeader
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onRefresh={handleRefresh}
        onOpenDir={handleOpenDir}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredExtensions.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Blocks size={32} className="mx-auto mb-2 text-neutral-300" />
              <p className="text-sm">
                {searchValue
                  ? "No extensions found"
                  : "No extensions installed"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Add extensions to the extensions folder
              </p>
            </div>
          ) : (
            filteredExtensions.map((extension) => (
              <ExtensionItem
                key={extension.id}
                extension={extension}
                isSelected={selectedExtension === extension.id}
                onClick={() => setSelectedExtension(extension.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ExtensionColumnHeader({
  searchValue,
  onSearchChange,
  onRefresh,
  onOpenDir,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onOpenDir: () => void;
}) {
  const [showSearch, setShowSearch] = useState(false);

  const handleSearchToggle = () => {
    if (showSearch) {
      onSearchChange("");
    }
    setShowSearch(!showSearch);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onSearchChange("");
      setShowSearch(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="@container border-b border-neutral-200">
      <div className="py-2 pl-3 pr-1 flex items-center justify-between h-12 min-w-0">
        <h3 className="text-sm font-medium">Extensions</h3>
        <div className="flex items-center shrink-0">
          <Button
            onClick={handleSearchToggle}
            size="icon"
            variant="ghost"
            title="Search"
          >
            <Search size={16} />
          </Button>
          <Button
            onClick={onRefresh}
            size="icon"
            variant="ghost"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </Button>
          <Button
            onClick={onOpenDir}
            size="icon"
            variant="ghost"
            title="Open Extensions Folder"
          >
            <FolderOpen size={16} />
          </Button>
        </div>
      </div>
      {showSearch && (
        <div className="flex items-center gap-2 px-3 border-t bg-white border-neutral-200 h-12">
          <Search className="h-4 w-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search extensions..."
            className="w-full bg-transparent text-sm focus:outline-hidden placeholder:text-neutral-400"
            autoFocus
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="p-1 rounded-xs hover:bg-neutral-100 transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ExtensionItem({
  extension,
  isSelected,
  onClick,
}: {
  extension: ExtensionInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100 transition-colors",
        isSelected ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="flex items-center gap-2">
        <Blocks className="h-4 w-4 text-neutral-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1">
            {extension.name}
            <span className="text-xs text-stone-400 font-mono">
              v{extension.version}
            </span>
          </div>
          {extension.description && (
            <div className="text-xs text-neutral-500 truncate">
              {extension.description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
