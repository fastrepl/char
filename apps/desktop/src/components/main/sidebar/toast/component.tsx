import { X } from "lucide-react";

import { cn } from "@hypr/utils";

import type { DownloadProgress, ToastType } from "./types";

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastType;
  onDismiss?: () => void;
}) {
  return (
    <div className="overflow-hidden p-1">
      <div
        className={cn([
          "relative group overflow-hidden rounded-lg",
          "flex flex-col gap-2",
          "bg-white p-4",
          toast.variant === "error"
            ? "border border-red-300 shadow-xs shadow-red-200"
            : "border border-neutral-200 shadow-xs",
        ])}
      >
        {toast.dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss toast"
            className={cn([
              "absolute top-1.5 right-1.5 size-6 flex items-center justify-center rounded-xs",
              "opacity-0 group-hover:opacity-50 hover:opacity-100!",
              "hover:bg-neutral-200",
              "transition-all duration-200",
            ])}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {(toast.icon || toast.title) && (
          <div className="flex items-center gap-2">
            {toast.icon}
            {toast.title && (
              <h3 className="text-lg font-bold text-neutral-900">
                {toast.title}
              </h3>
            )}
          </div>
        )}

        <div className="text-sm">{toast.description}</div>

        <div className="flex flex-col gap-2 mt-1">
          {toast.progress !== undefined && (
            <ProgressBar progress={toast.progress} />
          )}
          {toast.downloads && toast.downloads.length > 0 && (
            <div className="flex flex-col gap-2">
              {toast.downloads.map((download) => (
                <DownloadProgressBar key={download.model} download={download} />
              ))}
            </div>
          )}
          {toast.primaryAction && (
            <button
              onClick={toast.primaryAction.onClick}
              className="w-full py-2 rounded-full bg-stone-600 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
            >
              {toast.primaryAction.label}
            </button>
          )}
          {toast.secondaryAction && (
            <button
              onClick={toast.secondaryAction.onClick}
              className="w-full py-2 rounded-full bg-neutral-200 text-neutral-900 text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
            >
              {toast.secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="relative w-full py-2 rounded-full bg-linear-to-t from-neutral-200 to-neutral-100 overflow-hidden">
      <div
        className="absolute inset-0 bg-linear-to-t from-stone-600 to-stone-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
      <span
        className={cn([
          "relative z-10 block text-center text-sm font-medium transition-colors duration-150",
          progress >= 48 ? "text-white" : "text-neutral-900",
        ])}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
}

function DownloadProgressBar({ download }: { download: DownloadProgress }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span className="font-medium truncate">{download.displayName}</span>
        <span>{Math.round(download.progress)}%</span>
      </div>
      <div className="relative w-full h-2 rounded-full bg-linear-to-t from-neutral-200 to-neutral-100 overflow-hidden">
        <div
          className="absolute inset-0 bg-linear-to-t from-stone-600 to-stone-500 transition-all duration-300 rounded-full"
          style={{ width: `${download.progress}%` }}
        />
      </div>
    </div>
  );
}
