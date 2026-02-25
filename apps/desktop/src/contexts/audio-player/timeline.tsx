import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { useAudioPlayer } from "./provider";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function Timeline() {
  const {
    registerContainer,
    state,
    pause,
    resume,
    start,
    time,
    playbackRate,
    setPlaybackRate,
  } = useAudioPlayer();
  const [showRateMenu, setShowRateMenu] = useState(false);
  const rateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        rateMenuRef.current &&
        !rateMenuRef.current.contains(e.target as Node)
      ) {
        setShowRateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = () => {
    if (state === "playing") {
      pause();
    } else if (state === "paused") {
      resume();
    } else if (state === "stopped") {
      start();
    }
  };

  return (
    <div className="w-full bg-neutral-50 rounded-xl">
      <div className={cn(["flex items-center gap-2 p-2", "w-full max-w-full"])}>
        <button
          onClick={handleClick}
          className={cn([
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            "bg-white border border-neutral-200",
            "hover:bg-neutral-100 hover:scale-110 transition-all",
            "shrink-0 shadow-xs",
          ])}
        >
          {state === "playing" ? (
            <Pause className="w-4 h-4 text-neutral-900" fill="currentColor" />
          ) : (
            <Play className="w-4 h-4 text-neutral-900" fill="currentColor" />
          )}
        </button>

        <div className="inline-flex gap-1 items-center text-xs text-neutral-600 shrink-0 font-mono tabular-nums">
          <span>{formatTime(time.current)}</span>/
          <span>{formatTime(time.total)}</span>
        </div>

        <div className="relative shrink-0" ref={rateMenuRef}>
          <button
            onClick={() => setShowRateMenu((prev) => !prev)}
            className={cn([
              "flex items-center justify-center",
              "px-1.5 h-6 rounded-md",
              "bg-white border border-neutral-200",
              "hover:bg-neutral-100 transition-colors",
              "text-xs font-mono text-neutral-700",
              "shadow-xs",
            ])}
          >
            {playbackRate}x
          </button>
          {showRateMenu && (
            <div
              className={cn([
                "absolute bottom-full mb-1 right-0",
                "bg-white border border-neutral-200 rounded-lg shadow-md",
                "py-1 z-50",
              ])}
            >
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    setShowRateMenu(false);
                  }}
                  className={cn([
                    "block w-full px-3 py-1 text-xs font-mono text-left",
                    "hover:bg-neutral-100 transition-colors",
                    rate === playbackRate
                      ? "text-neutral-900 font-semibold"
                      : "text-neutral-600",
                  ])}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          ref={registerContainer}
          className="flex-1 min-w-0"
          style={{ minHeight: "30px", width: "100%" }}
        />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
