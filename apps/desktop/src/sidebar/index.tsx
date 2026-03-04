import { useQuery } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import {
  AxeIcon,
  Loader2Icon,
  PanelLeftCloseIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { lazy, Suspense, useMemo, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { ProfileSection } from "./profile";
import { TimelineView } from "./timeline";
import { ToastArea } from "./toast";

import { useShell } from "~/contexts/shell";
import { SearchResults } from "~/search/components/sidebar";
import { useSearch } from "~/search/contexts/ui";
import { TrafficLights } from "~/shared/ui/traffic-lights";
import { useTabs } from "~/store/zustand/tabs";
import { commands } from "~/types/tauri.gen";

const DevtoolView = lazy(() =>
  import("./devtool").then((m) => ({ default: m.DevtoolView })),
);

export function LeftSidebar() {
  const { leftsidebar } = useShell();
  const { query } = useSearch();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const isLinux = platform() === "linux";

  const { data: showDevtoolButton = false } = useQuery({
    queryKey: ["show_devtool"],
    queryFn: () => commands.showDevtool(),
  });

  const showSearchResults = query.trim() !== "";

  return (
    <div className="flex h-full w-70 shrink-0 flex-col gap-1 overflow-hidden">
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row items-center",
          "h-9 w-full py-1",
          isLinux ? "justify-between pl-3" : "justify-end pl-20",
          "shrink-0",
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

      <SidebarSearchInput />

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
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

function SidebarSearchInput() {
  const {
    query,
    setQuery,
    isSearching,
    isIndexing,
    inputRef,
    results,
    selectedIndex,
    setSelectedIndex,
  } = useSearch();
  const openNew = useTabs((state) => state.openNew);
  const inputLocalRef = useRef<HTMLInputElement>(null);

  const flatResults = useMemo(() => {
    if (!results) return [];
    return results.groups.flatMap((g) => g.results);
  }, [results]);

  const showLoading = isSearching || isIndexing;

  const ref = inputRef ?? inputLocalRef;

  return (
    <div className="shrink-0 px-2">
      <div
        className={cn([
          "flex items-center gap-2",
          "h-8 rounded-lg px-2",
          "border border-neutral-200 bg-neutral-200/50",
        ])}
      >
        {showLoading ? (
          <Loader2Icon className="size-4 shrink-0 animate-spin text-neutral-400" />
        ) : (
          <SearchIcon className="size-4 shrink-0 text-neutral-400" />
        )}
        <input
          ref={ref}
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
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && query.trim()) {
              e.preventDefault();
              openNew({
                type: "search",
                state: {
                  selectedTypes: null,
                  initialQuery: query.trim(),
                },
              });
              setQuery("");
              e.currentTarget.blur();
            }
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
            if (
              e.key === "Enter" &&
              !e.metaKey &&
              !e.ctrlKey &&
              selectedIndex >= 0 &&
              selectedIndex < flatResults.length
            ) {
              e.preventDefault();
              const item = flatResults[selectedIndex];
              if (item.type === "session") {
                openNew({ type: "sessions", id: item.id });
              } else if (item.type === "human") {
                openNew({
                  type: "contacts",
                  state: {
                    selected: { type: "person", id: item.id },
                  },
                });
              } else if (item.type === "organization") {
                openNew({
                  type: "contacts",
                  state: {
                    selected: { type: "organization", id: item.id },
                  },
                });
              }
              e.currentTarget.blur();
            }
          }}
          className={cn([
            "min-w-0 flex-1 bg-transparent text-sm",
            "placeholder:text-neutral-400",
            "focus:outline-hidden",
          ])}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="shrink-0 text-neutral-400 hover:text-neutral-600"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
        {!query && <Kbd className="shrink-0 text-[10px]">⌘ K</Kbd>}
      </div>
    </div>
  );
}
