import { useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  LoaderIcon,
  Pause,
  Play,
  SparklesIcon,
  UndoIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { denoiseStore } from "~/services/denoise";

import { cn } from "@hypr/utils";

import { useAudioPlayer, useAudioTime } from "./provider";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function Timeline() {
  const { sessionId, registerContainer } = useAudioPlayer();

  return (
    <div className="w-full bg-neutral-50 rounded-xl">
      <div className={cn(["flex items-center gap-2 p-2", "w-full max-w-full"])}>
        <PlayPauseButton />
        <TimeDisplay />
        <PlaybackRateSelector />
        <DenoiseButton sessionId={sessionId} />
        <div
          ref={registerContainer}
          className="flex-1 min-w-0"
          style={{ minHeight: "30px", width: "100%" }}
        />
      </div>
    </div>
  );
}

function PlayPauseButton() {
  const { state, pause, resume, start } = useAudioPlayer();

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
  );
}

function TimeDisplay() {
  const time = useAudioTime();

  return (
    <div className="inline-flex gap-1 items-center text-xs text-neutral-600 shrink-0 font-mono tabular-nums">
      <span>{formatTime(time.current)}</span>/
      <span>{formatTime(time.total)}</span>
    </div>
  );
}

function PlaybackRateSelector() {
  const { playbackRate, setPlaybackRate } = useAudioPlayer();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setShowMenu((prev) => !prev)}
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
      {showMenu && (
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
                setShowMenu(false);
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
  );
}

function DenoiseButton({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const job = useStore(denoiseStore, (state) => state.jobs[sessionId]);

  const invalidateAudio = () => {
    void queryClient.invalidateQueries({
      queryKey: ["audio", sessionId, "url"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["audio", sessionId, "exist"],
    });
  };

  const handleDenoise = () => {
    void denoiseStore.getState().startDenoise(sessionId);
  };

  const handleConfirm = () => {
    void denoiseStore
      .getState()
      .confirmDenoise(sessionId)
      .then(invalidateAudio);
  };

  const handleRevert = () => {
    void denoiseStore.getState().revertDenoise(sessionId).then(invalidateAudio);
  };

  useEffect(() => {
    if (job?.status === "completed") {
      invalidateAudio();
    }
  }, [job?.status, sessionId, queryClient]);

  if (job?.status === "running") {
    return (
      <button
        disabled
        className={cn([
          "flex items-center justify-center gap-1",
          "px-1.5 h-6 rounded-md",
          "bg-neutral-100 border border-neutral-200",
          "text-xs font-mono text-neutral-500",
          "shrink-0",
        ])}
      >
        <LoaderIcon className="w-3 h-3 animate-spin" />
        <span>{Math.round(job.progress)}%</span>
      </button>
    );
  }

  if (job?.status === "completed") {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleConfirm}
          title="Confirm denoised audio"
          className={cn([
            "flex items-center justify-center",
            "px-1.5 h-6 rounded-md",
            "bg-white border border-neutral-200",
            "hover:bg-green-50 transition-colors",
            "text-xs text-green-600",
            "shadow-xs",
          ])}
        >
          <CheckIcon className="w-3 h-3" />
        </button>
        <button
          onClick={handleRevert}
          title="Revert to original audio"
          className={cn([
            "flex items-center justify-center",
            "px-1.5 h-6 rounded-md",
            "bg-white border border-neutral-200",
            "hover:bg-neutral-100 transition-colors",
            "text-xs text-neutral-500",
            "shadow-xs",
          ])}
        >
          <UndoIcon className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDenoise}
      title={
        job?.status === "failed" ? `Failed: ${job.error}` : "Denoise audio"
      }
      className={cn([
        "flex items-center justify-center",
        "px-1.5 h-6 rounded-md",
        "bg-white border border-neutral-200",
        "hover:bg-neutral-100 transition-colors",
        "text-xs text-neutral-700",
        "shrink-0 shadow-xs",
        job?.status === "failed" && "border-red-200",
      ])}
    >
      <SparklesIcon
        className={cn(["w-3 h-3", job?.status === "failed" && "text-red-500"])}
      />
    </button>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
