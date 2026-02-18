import { ArrowDownUp, Plus, Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

export type SortOption =
  | "alphabetical"
  | "reverse-alphabetical"
  | "oldest"
  | "newest";

export function SortDropdown({
  sortOption,
  setSortOption,
}: {
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Sort options">
          <ArrowDownUp size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={sortOption}
          onValueChange={(value) => setSortOption(value as SortOption)}
        >
          <DropdownMenuRadioItem
            value="alphabetical"
            className="text-xs cursor-pointer"
          >
            A-Z
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="reverse-alphabetical"
            className="text-xs cursor-pointer"
          >
            Z-A
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="oldest"
            className="text-xs cursor-pointer"
          >
            Oldest
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="newest"
            className="text-xs cursor-pointer"
          >
            Newest
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ColumnHeader({
  title,
  sortOption,
  setSortOption,
  onAdd,
  searchValue,
  onSearchChange,
  showSearch: showSearchProp,
  onShowSearchChange,
}: {
  title: string;
  sortOption?: SortOption;
  setSortOption?: (option: SortOption) => void;
  onAdd: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  onShowSearchChange?: (show: boolean) => void;
}) {
  const [showSearchInternal, setShowSearchInternal] = useState(false);
  const showSearch = showSearchProp ?? showSearchInternal;
  const setShowSearch = onShowSearchChange ?? setShowSearchInternal;

  const handleSearchToggle = () => {
    if (showSearch) {
      onSearchChange?.("");
    }
    setShowSearch(!showSearch);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onSearchChange?.("");
      setShowSearch(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="@container border-b border-neutral-200">
      <div className="py-2 pl-3 pr-1 flex items-center justify-between h-12 min-w-0">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center shrink-0">
          {onSearchChange && (
            <Button
              onClick={handleSearchToggle}
              size="icon"
              variant="ghost"
              title="Search"
            >
              <Search size={16} />
            </Button>
          )}
          {sortOption && setSortOption && (
            <div className="hidden @[220px]:block">
              <SortDropdown
                sortOption={sortOption}
                setSortOption={setSortOption}
              />
            </div>
          )}
          <Button onClick={onAdd} size="icon" variant="ghost" title="Add">
            <Plus size={16} />
          </Button>
        </div>
      </div>
      {showSearch && onSearchChange && (
        <div className="flex items-center gap-2 px-3 border-t bg-white border-neutral-200 h-12">
          <Search className="h-4 w-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchValue || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
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
