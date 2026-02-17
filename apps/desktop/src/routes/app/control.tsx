import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { ChevronDown, Mic, MicOff, Square, X } from "lucide-react";
import { useRef } from "react";

import { commands as iconCommands } from "@hypr/plugin-icon";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useListener } from "../../contexts/listener";
import { useWidgetState } from "../../hooks/useWidgetState";

export const Route = createFileRoute("/app/control")({
  component: Component,
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function Component() {
  const { isExpanded, expand, collapse } = useWidgetState();

  const { status, seconds, muted, amplitude } = useListener((state) => ({
    status: state.live.status,
    seconds: state.live.seconds,
    muted: state.live.muted,
    amplitude: state.live.amplitude,
  }));

  const { stop, setMuted } = useListener((state) => ({
    stop: state.stop,
    setMuted: state.setMuted,
  }));

  const isActive = status === "active";
  const isFinalizing = status === "finalizing";

  if (!isExpanded) {
    return (
      <CollapsedWidget
        onExpand={expand}
        isActive={isActive}
        isFinalizing={isFinalizing}
      />
    );
  }

  return (
    <ExpandedPanel
      onCollapse={collapse}
      isActive={isActive}
      isFinalizing={isFinalizing}
      seconds={seconds}
      muted={muted}
      amplitude={amplitude}
      stop={stop}
      setMuted={setMuted}
    />
  );
}

function CollapsedWidget({
  onExpand,
  isActive,
  isFinalizing,
}: {
  onExpand: () => void;
  isActive: boolean;
  isFinalizing: boolean;
}) {
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const { data: iconBase64 } = useQuery({
    queryKey: ["app-icon"],
    queryFn: async () => {
      const result = await iconCommands.getIcon();
      if (result.status === "ok") {
        return result.data;
      }
      return null;
    },
    staleTime: Infinity,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseDownPos.current) return;

    const dx = Math.abs(e.clientX - mouseDownPos.current.x);
    const dy = Math.abs(e.clientY - mouseDownPos.current.y);
    const wasDrag = dx > 5 || dy > 5;

    mouseDownPos.current = null;

    if (!wasDrag) {
      onExpand();
    }
  };

  const handleMouseLeave = () => {
    mouseDownPos.current = null;
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={cn([
        "h-full w-full flex items-center justify-center cursor-pointer",
      ])}
    >
      {isActive || isFinalizing ? (
        <div
          data-tauri-drag-region
          className={cn([
            "w-3 h-3 rounded-full",
            isFinalizing
              ? "bg-yellow-500 animate-pulse"
              : "bg-red-500 animate-pulse",
          ])}
        />
      ) : iconBase64 ? (
        <img
          data-tauri-drag-region
          src={`data:image/png;base64,${iconBase64}`}
          alt="App Icon"
          className="w-12 h-12 rounded-xl"
          draggable={false}
        />
      ) : (
        <div
          data-tauri-drag-region
          className="w-12 h-12 rounded-full bg-white/40"
        />
      )}
    </div>
  );
}

function ExpandedPanel({
  onCollapse,
  isActive,
  isFinalizing,
  seconds,
  muted,
  amplitude,
  stop,
  setMuted,
}: {
  onCollapse: () => void;
  isActive: boolean;
  isFinalizing: boolean;
  seconds: number;
  muted: boolean;
  amplitude: { mic: number };
  stop: () => void;
  setMuted: (muted: boolean) => void;
}) {
  const handleClose = async () => {
    if (!isTauri()) {
      return;
    }
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  return (
    <div
      className={cn([
        "h-full w-full flex flex-col",
        "bg-black/70 backdrop-blur-md rounded-xl",
      ])}
    >
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row shrink-0",
          "w-full items-center justify-between h-8",
          "px-3",
        ])}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10"
          onClick={onCollapse}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10"
          onClick={() => {
            void handleClose();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </header>

      <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4">
        {isActive || isFinalizing ? (
          <>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isFinalizing
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500 animate-pulse",
                )}
              />
              <span className="text-white font-mono text-2xl font-medium">
                {formatTime(seconds)}
              </span>
            </div>

            <div className="flex items-center gap-2 h-4">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-all duration-75",
                      amplitude.mic > i * 0.2 ? "bg-green-400" : "bg-white/20",
                    )}
                    style={{
                      height: `${Math.max(4, Math.min(16, amplitude.mic * 80))}px`,
                    }}
                  />
                ))}
              </div>
              <span className="text-white/40 text-xs">MIC</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full",
                  muted
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
                onClick={() => setMuted(!muted)}
              >
                {muted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
                onClick={stop}
                disabled={isFinalizing}
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-white/60 text-sm text-center">
            No active session
          </div>
        )}
      </div>
    </div>
  );
}
