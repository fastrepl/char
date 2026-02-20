import { Pin, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useCmdKeyPressed } from "@hypr/ui/hooks/use-cmd-key-pressed";
import { cn } from "@hypr/utils";

import { type Tab } from "../../../store/zustand/tabs";
import { InteractiveButton } from "../../interactive-button";

type TabItemProps<T extends Tab = Tab> = { tab: T; tabIndex?: number } & {
  handleSelectThis: (tab: T) => void;
  handleCloseThis: (tab: T) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
  handlePinThis: (tab: T) => void;
  handleUnpinThis: (tab: T) => void;
  pendingCloseConfirmationTab?: Tab | null;
  setPendingCloseConfirmationTab?: (tab: Tab | null) => void;
};

type TabAccent = "neutral" | "red" | "blue";

const accentColors: Record<
  TabAccent,
  {
    selected: string[];
    unselected: string[];
    hover: { selected: string; unselected: string };
  }
> = {
  neutral: {
    selected: ["bg-neutral-50", "text-black", "border-stone-400"],
    unselected: ["bg-neutral-50", "text-neutral-500", "border-transparent"],
    hover: {
      selected: "text-neutral-700 hover:text-neutral-900",
      unselected: "text-neutral-500 hover:text-neutral-700",
    },
  },
  red: {
    selected: ["bg-red-50", "text-red-600", "border-red-400"],
    unselected: ["bg-red-50", "text-red-500", "border-transparent"],
    hover: {
      selected: "text-red-600 hover:text-red-700",
      unselected: "text-red-600 hover:text-red-700",
    },
  },
  blue: {
    selected: ["bg-sky-50", "text-sky-700", "border-sky-400"],
    unselected: ["bg-sky-50", "text-sky-500", "border-transparent"],
    hover: {
      selected: "text-sky-500 hover:text-sky-700",
      unselected: "text-sky-400 hover:text-sky-600",
    },
  },
};

type TabItemBaseProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  selected: boolean;
  active?: boolean;
  finalizing?: boolean;
  pinned?: boolean;
  allowPin?: boolean;
  allowClose?: boolean;
  isEmptyTab?: boolean;
  tabIndex?: number;
  accent?: TabAccent;
  showCloseConfirmation?: boolean;
  onCloseConfirmationChange?: (show: boolean) => void;
} & {
  handleCloseThis: () => void;
  handleSelectThis: () => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
  handlePinThis: () => void;
  handleUnpinThis: () => void;
};

export type TabItem<T extends Tab = Tab> = (
  props: TabItemProps<T>,
) => React.ReactNode;

export function TabItemBase({
  icon,
  title,
  selected,
  active = false,
  finalizing = false,
  pinned = false,
  allowPin = true,
  allowClose = true,
  isEmptyTab = false,
  tabIndex,
  accent = "neutral",
  showCloseConfirmation = false,
  onCloseConfirmationChange,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}: TabItemBaseProps) {
  const colors = accentColors[accent];
  const isCmdPressed = useCmdKeyPressed();
  const [isHovered, setIsHovered] = useState(false);
  const [localShowConfirmation, setLocalShowConfirmation] = useState(false);

  const isConfirmationOpen = showCloseConfirmation || localShowConfirmation;

  useEffect(() => {
    if (showCloseConfirmation) {
      setLocalShowConfirmation(true);
    }
  }, [showCloseConfirmation]);

  const handleCloseConfirmationChange = (open: boolean) => {
    setLocalShowConfirmation(open);
    onCloseConfirmationChange?.(open);
  };

  const handleAttemptClose = () => {
    if (active) {
      handleCloseConfirmationChange(true);
    } else {
      handleCloseThis();
    }
  };

  const handleConfirmClose = useCallback(() => {
    setLocalShowConfirmation(false);
    onCloseConfirmationChange?.(false);
    handleCloseThis();
  }, [handleCloseThis, onCloseConfirmationChange]);

  useEffect(() => {
    if (!isConfirmationOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isConfirmationOpen, handleConfirmClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 && !active && allowClose) {
      e.preventDefault();
      e.stopPropagation();
      handleCloseThis();
    }
  };

  const contextMenu = allowClose
    ? active || (selected && !isEmptyTab)
      ? [
          { id: "close-tab", text: "Close", action: handleAttemptClose },
          ...(allowPin
            ? [
                { separator: true as const },
                pinned
                  ? {
                      id: "unpin-tab",
                      text: "Unpin tab",
                      action: handleUnpinThis,
                    }
                  : { id: "pin-tab", text: "Pin tab", action: handlePinThis },
              ]
            : []),
        ]
      : [
          { id: "close-tab", text: "Close", action: handleAttemptClose },
          {
            id: "close-others",
            text: "Close others",
            action: handleCloseOthers,
          },
          { id: "close-all", text: "Close all", action: handleCloseAll },
          ...(allowPin
            ? [
                { separator: true as const },
                pinned
                  ? {
                      id: "unpin-tab",
                      text: "Unpin tab",
                      action: handleUnpinThis,
                    }
                  : { id: "pin-tab", text: "Pin tab", action: handlePinThis },
              ]
            : []),
        ]
    : [];

  const showShortcut = isCmdPressed && tabIndex !== undefined;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="h-full relative"
    >
      <InteractiveButton
        asChild
        contextMenu={contextMenu}
        onClick={handleSelectThis}
        onMouseDown={handleMouseDown}
        className={cn([
          "flex items-center gap-1 relative",
          "w-[160px] h-full px-2",
          "rounded-xl border",
          "cursor-pointer group",
          "transition-colors duration-200",
          selected ? colors.selected : colors.unselected,
        ])}
      >
        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
          <div className="shrink-0 relative w-4 h-4">
            <div
              className={cn([
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isHovered || isConfirmationOpen ? "opacity-0" : "opacity-100",
              ])}
            >
              {finalizing ? (
                <Spinner size={16} />
              ) : active ? (
                <div className="relative size-2">
                  <div className="absolute inset-0 rounded-full bg-red-600"></div>
                  <div className="absolute inset-0 rounded-full bg-red-300 animate-ping"></div>
                </div>
              ) : pinned ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnpinThis();
                  }}
                  className={cn([
                    "flex items-center justify-center transition-colors",
                    colors.hover[selected ? "selected" : "unselected"],
                  ])}
                >
                  <Pin size={14} />
                </button>
              ) : (
                icon
              )}
            </div>
            {allowClose && (
              <div
                className={cn([
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                  isHovered || isConfirmationOpen ? "opacity-100" : "opacity-0",
                ])}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAttemptClose();
                  }}
                  className={cn([
                    "flex items-center justify-center transition-colors",
                    colors.hover[selected ? "selected" : "unselected"],
                  ])}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <span className="truncate">{title}</span>
        </div>
        {showShortcut && (
          <div className="absolute top-0.75 right-2 pointer-events-none">
            <Kbd>⌘ {tabIndex}</Kbd>
          </div>
        )}
      </InteractiveButton>
      <Popover
        open={active && isConfirmationOpen}
        onOpenChange={handleCloseConfirmationChange}
      >
        <PopoverTrigger asChild>
          <div className="absolute inset-0 pointer-events-none" />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-[240px] p-3 rounded-xl"
          sideOffset={2}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-700">
              Are you sure you want to close this tab? This will stop Char
              from listening.
            </p>
            <Button
              variant="destructive"
              className="w-full h-9 rounded-lg flex items-center justify-center relative group"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmClose();
              }}
            >
              <span>Close</span>
              <Kbd
                className={cn([
                  "absolute right-2",
                  "bg-red-200/20 border-red-200/30 text-red-100",
                  "transition-all duration-100",
                  "group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
                  "group-active:translate-y-0.5 group-active:shadow-none",
                ])}
              >
                ⌘ W
              </Kbd>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
