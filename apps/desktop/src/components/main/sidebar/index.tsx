import { useQuery } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import {
  AxeIcon,
  Loader2Icon,
  PanelLeftCloseIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { useCmdKeyPressed } from "@hypr/ui/hooks/use-cmd-key-pressed";
import { cn } from "@hypr/utils";

import { useSearch } from "../../../contexts/search/ui";
import { useShell } from "../../../contexts/shell";
import { commands } from "../../../types/tauri.gen";
import { TrafficLights } from "../../window/traffic-lights";
import { ProfileSection } from "./profile";
import { SearchResults } from "./search";
import { TimelineView } from "./timeline";
import { ToastArea } from "./toast";

const DevtoolView = lazy(() =>
  import("./devtool").then((m) => ({ default: m.DevtoolView })),
);

export function LeftSidebar() {
  const { leftsidebar } = useShell();
  const {
    query,
    setQuery,
    inputRef,
    setFocusImpl,
    isSearching,
    isIndexing,
    selectedIndex,
    setSelectedIndex,
    results,
  } = useSearch();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const isCmdPressed = useCmdKeyPressed();
  const isLinux = platform() === "linux";

  const { data: showDevtoolButton = false } = useQuery({
    queryKey: ["show_devtool"],
    queryFn: () => commands.showDevtool(),
  });

  const showSearchResults = query.trim() !== "";
  const showLoading = isSearching || isIndexing;
  const showShortcut = isCmdPressed && !query;

  useEffect(() => {
    setFocusImpl(() => {
      inputRef.current?.focus();
    });
  }, [setFocusImpl, inputRef]);

  return (
    <div className="h-full w-70 flex flex-col overflow-hidden shrink-0 gap-1">
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row items-center",
          "w-full h-9 py-1",
          isLinux ? "pl-3 justify-between" : "pl-20 justify-end",
          "shrink-0",
          "rounded-xl bg-neutral-50",
        ])}
      >
        {isLinux && <TrafficLights />}
        <div className="flex items-center">
          {showDevtoolButton && (
            <Button
              size="icon"
              variant="ghost"
              onClick={leftsidebar.toggleDevtool}
            >
              <AxeIcon size={16} />
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={leftsidebar.toggleExpanded}
              >
                <PanelLeftCloseIcon size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>Toggle sidebar</span>
              <Kbd className="animate-kbd-press">⌘ \</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="px-2 shrink-0">
        <div className="relative flex items-center w-full">
          {showLoading ? (
            <Loader2Icon
              className={cn([
                "h-4 w-4 absolute left-2.5 text-neutral-400 animate-spin",
              ])}
            />
          ) : (
            <SearchIcon
              className={cn(["h-4 w-4 absolute left-2.5 text-neutral-400"])}
            />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (query.trim()) {
                  setQuery("");
                  setSelectedIndex(-1);
                } else {
                  e.currentTarget.blur();
                }
              }
              const flatResults =
                results?.groups.flatMap((g) => g.results) ?? [];
              if (e.key === "ArrowDown" && flatResults.length > 0) {
                e.preventDefault();
                setSelectedIndex(
                  Math.min(selectedIndex + 1, flatResults.length - 1),
                );
              }
              if (e.key === "ArrowUp" && flatResults.length > 0) {
                e.preventDefault();
                setSelectedIndex(Math.max(selectedIndex - 1, -1));
              }
            }}
            className={cn([
              "text-sm placeholder:text-sm placeholder:text-neutral-400",
              "w-full pl-8 pr-8 py-1.5",
              "rounded-lg bg-neutral-100",
              "focus:outline-hidden focus:bg-neutral-200",
              "transition-colors",
            ])}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(-1);
              }}
              className={cn([
                "absolute right-2.5",
                "h-4 w-4",
                "text-neutral-400 hover:text-neutral-600",
                "transition-colors",
              ])}
              aria-label="Clear search"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
          {showShortcut && (
            <div className="absolute right-2 flex items-center">
              <Kbd>⌘ K</Kbd>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden gap-1">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {leftsidebar.showDevtool ? (
            <Suspense fallback={null}>
              <DevtoolView />
            </Suspense>
          ) : showSearchResults ? (
            <SearchResults />
          ) : (
            <TimelineView />
          )}
          {!leftsidebar.showDevtool && (
            <ToastArea isProfileExpanded={isProfileExpanded} />
          )}
        </div>
        <div className="relative z-30">
          <ProfileSection onExpandChange={setIsProfileExpanded} />
        </div>
      </div>
    </div>
  );
}
