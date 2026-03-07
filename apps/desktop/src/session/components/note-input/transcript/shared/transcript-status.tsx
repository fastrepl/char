import type { DegradedError } from "@hypr/plugin-listener";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { cn } from "@hypr/utils";

import { useListener } from "~/stt/contexts";

function degradedMessage(error: DegradedError): string {
  switch (error.type) {
    case "authentication_failed":
      return `Authentication failed (${error.provider})`;
    case "upstream_unavailable":
      return error.message;
    case "connection_timeout":
      return "Transcription connection timed out";
    case "retry_exhausted":
      return error.last_error || "Transcription retries exhausted";
    case "stream_error":
      return error.message;
  }
}

export function DegradedState({ error }: { error: DegradedError }) {
  const amplitude = useListener((state) => state.live.amplitude);
  const recording = useListener((state) => state.live.recording);

  const recordingTitle =
    recording.status === "enabled"
      ? "Saving audio locally"
      : "Audio is not being saved locally";
  const recordingMessage =
    recording.status === "enabled"
      ? "Char will keep a local recording for the rest of this session."
      : recording.status === "failed"
        ? recording.error || "Char could not start local backup recording."
        : "Local backup recording is off for this session.";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <DancingSticks
        amplitude={Math.min(Math.hypot(amplitude.mic, amplitude.speaker), 1)}
        color="#a3a3a3"
        height={40}
        width={80}
        stickWidth={3}
        gap={3}
      />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm font-medium text-neutral-600">
          Recording continues
        </p>
        <p className="text-xs text-neutral-400">{degradedMessage(error)}</p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-neutral-200/80 bg-white/80 px-4 py-3 shadow-xs">
        <div className="text-left">
          <p className="text-sm font-medium text-neutral-700">
            {recordingTitle}
          </p>
          <p className="text-xs text-neutral-500">{recordingMessage}</p>
        </div>
      </div>
    </div>
  );
}

export function ScrollToBottomButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "absolute bottom-3 left-1/2 z-30 -translate-x-1/2",
        "rounded-full px-4 py-2",
        "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
        "shadow-xs hover:scale-[102%] hover:shadow-md active:scale-[98%]",
        "text-xs font-light",
        "transition-opacity duration-150",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ])}
    >
      Go to bottom
    </button>
  );
}
