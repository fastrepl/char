import { AudioLinesIcon } from "lucide-react";

import { Spinner } from "@hypr/ui/components/ui/spinner";

export function TranscriptEmptyState({ isBatching }: { isBatching?: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400">
      {isBatching ? (
        <Spinner size={28} />
      ) : (
        <AudioLinesIcon className="w-8 h-8" />
      )}
      <p className="text-sm">
        {isBatching ? "Generating transcript..." : "No transcript available"}
      </p>
    </div>
  );
}
