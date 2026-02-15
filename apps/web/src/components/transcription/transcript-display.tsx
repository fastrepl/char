import { cn } from "@hypr/utils";

type Status =
  | "idle"
  | "uploading"
  | "uploaded"
  | "queued"
  | "transcribing"
  | "summarizing"
  | "done"
  | "error";

const statusMessages: Record<Status, string> = {
  idle: "Upload an audio file to see the transcript",
  uploading: "Uploading audio file...",
  uploaded: "Ready to transcribe",
  queued: "Queued for transcription...",
  transcribing: "Transcribing audio...",
  summarizing: "Generating summary...",
  done: "",
  error: "",
};

export function TranscriptDisplay({
  transcript,
  status,
  error,
}: {
  transcript: string | null;
  status: Status;
  error?: string | null;
}) {
  if (status === "error" && error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xs p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const isProcessing =
    status === "uploading" ||
    status === "queued" ||
    status === "transcribing" ||
    status === "summarizing";

  if (isProcessing) {
    return (
      <div className="border border-neutral-200 rounded-xs p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600" />
          <p className="text-neutral-600">{statusMessages[status]}</p>
        </div>
      </div>
    );
  }

  if (status === "uploaded") {
    return (
      <div className="border border-neutral-200 rounded-xs p-8 text-center">
        <p className="text-neutral-500">
          Click "Start Transcription" to begin processing your audio
        </p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="border border-neutral-200 rounded-xs p-8 text-center">
        <p className="text-neutral-500">{statusMessages.idle}</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-xs p-6">
      <div className="prose prose-sm max-w-none">
        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
          {transcript}
        </p>
      </div>
    </div>
  );
}

export function FileInfo({
  fileName,
  fileSize,
  onRemove,
  isUploading,
  isProcessing,
  uploadProgress,
}: {
  fileName: string;
  fileSize: number;
  onRemove: () => void;
  isUploading?: boolean;
  isProcessing?: boolean;
  uploadProgress?: number;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canRemove = !isUploading && !isProcessing;

  return (
    <div
      className={cn([
        "flex items-center justify-between",
        "border border-neutral-200 rounded-xs p-4",
        "bg-stone-50/30",
      ])}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {isUploading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-stone-600 shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-neutral-700 truncate">
            {fileName}
          </p>
          <p className="text-xs text-neutral-500">
            {isUploading
              ? `Uploading... ${uploadProgress != null ? `${Math.round(uploadProgress)}%` : ""}`
              : formatSize(fileSize)}
          </p>
        </div>
      </div>
      <button
        onClick={onRemove}
        disabled={!canRemove}
        className={cn([
          "ml-4 px-3 py-1 text-sm border border-neutral-200 rounded-full transition-all",
          canRemove &&
            "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50",
          !canRemove && "text-neutral-400 cursor-not-allowed",
        ])}
      >
        Remove
      </button>
    </div>
  );
}
