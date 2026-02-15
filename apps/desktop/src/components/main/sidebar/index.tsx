import { useQuery } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import { AxeIcon, PanelLeftCloseIcon } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
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
  const { query } = useSearch();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const isLinux = platform() === "linux";

  const { data: showDevtoolButton = false } = useQuery({
    queryKey: ["show_devtool"],
    queryFn: () => commands.showDevtool(),
  });

  const showSearchResults = query.trim() !== "";

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
