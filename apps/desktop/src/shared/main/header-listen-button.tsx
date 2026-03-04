import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useNewNote, useNewNoteAndListen } from "./useNewNote";

import { useTabs } from "~/store/zustand/tabs";
import { useListener } from "~/stt/contexts";

const LABEL_WIDTH_ESTIMATE_PX = 90;

export function HeaderListenButton({
  contentOverflowPx,
}: {
  contentOverflowPx: number;
}) {
  const liveSessionId = useListener((state) => state.live.sessionId);
  const liveStatus = useListener((state) => state.live.status);
  const stop = useListener((state) => state.stop);

  const isActive = liveStatus === "active";
  const isFinalizing = liveStatus === "finalizing";

  const select = useTabs((state) => state.select);
  const tabs = useTabs((state) => state.tabs);

  const handleStop = useCallback(() => {
    stop();
    if (liveSessionId) {
      const tab = tabs.find(
        (t) => t.type === "sessions" && t.id === liveSessionId,
      );
      if (tab) {
        select(tab);
      }
    }
  }, [stop, liveSessionId, tabs, select]);

  if (isActive || isFinalizing) {
    return (
      <StopButton
        compact={contentOverflowPx > 0}
        finalizing={isFinalizing}
        onStop={handleStop}
      />
    );
  }

  return <DefaultButton contentOverflowPx={contentOverflowPx} />;
}

function StopButton({
  compact,
  finalizing,
  onStop,
}: {
  compact: boolean;
  finalizing: boolean;
  onStop: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={finalizing ? undefined : onStop}
          disabled={finalizing}
          className={cn([
            "flex h-7 items-center gap-1.5 rounded-full",
            compact ? "px-3" : "pl-3 pr-4",
            finalizing
              ? "cursor-wait bg-neutral-100 text-neutral-500"
              : "cursor-pointer bg-red-500 text-white transition-colors hover:bg-red-600",
            "disabled:pointer-events-none disabled:opacity-50",
          ])}
        >
          {finalizing
            ? <span className="animate-pulse text-sm">...</span>
            : (
              <>
                <div className="size-2.5 shrink-0 rounded-sm bg-white" />
                <AnimatePresence initial={false}>
                  {!compact && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden text-xs font-medium whitespace-nowrap"
                    >
                      Stop
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {finalizing ? "Finalizing..." : "Stop listening"}
      </TooltipContent>
    </Tooltip>
  );
}

function DefaultButton({ contentOverflowPx }: { contentOverflowPx: number }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(true);

  useEffect(() => {
    if (showLabel) {
      if (contentOverflowPx > 0) {
        setShowLabel(false);
      }
    } else {
      if (contentOverflowPx + LABEL_WIDTH_ESTIMATE_PX <= 0) {
        setShowLabel(true);
      }
    }
  }, [contentOverflowPx, showLabel]);

  const handleNewRecording = useNewNoteAndListen();

  return (
    <div className="flex items-center">
      <button
        onClick={handleNewRecording}
        className={cn([
          "flex h-7 cursor-pointer items-center gap-1.5 rounded-l-full pr-1.5 pl-3",
          "bg-neutral-800 text-white",
          "transition-colors hover:bg-neutral-700",
        ])}
      >
        <div className="size-2.5 rounded-full bg-red-500" />
        <AnimatePresence initial={false}>
          {showLabel && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden text-xs font-medium whitespace-nowrap"
            >
              New meeting
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn([
              "flex h-7 cursor-pointer items-center rounded-r-full pr-2 pl-1",
              "bg-neutral-800 text-white",
              "transition-colors hover:bg-neutral-700",
              "border-l border-neutral-600",
            ])}
          >
            <ChevronDownIcon size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={4}
          className="w-44 rounded-xl p-1.5"
        >
          <UploadOptions onDone={() => setDropdownOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function UploadOptions({ onDone }: { onDone: () => void }) {
  const handleNewNote = useNewNote({ behavior: "new" });

  const handleOption = useCallback(() => {
    onDone();
    handleNewNote();
  }, [onDone, handleNewNote]);

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        className="h-9 justify-center px-3 whitespace-nowrap"
        onClick={handleOption}
      >
        <span className="text-sm">Upload audio</span>
      </Button>
      <Button
        variant="ghost"
        className="h-9 justify-center px-3 whitespace-nowrap"
        onClick={handleOption}
      >
        <span className="text-sm">Upload transcript</span>
      </Button>
    </div>
  );
}
