import { MicOff } from "lucide-react";
import { useCallback } from "react";

import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import {
  ActionableTooltipContent,
  useHasTranscript,
  useListenButtonState,
} from "~/session/components/shared";
import { useTabs } from "~/store/zustand/tabs";
import { useListener } from "~/stt/contexts";
import { useStartListening } from "~/stt/useStartListening";

export function ListenButton({ sessionId }: { sessionId: string }) {
  const { shouldRender } = useListenButtonState(sessionId);
  const hasTranscript = useHasTranscript(sessionId);

  if (!shouldRender) {
    return <DancingSticksIndicator sessionId={sessionId} />;
  }

  if (hasTranscript) {
    return <StartButton sessionId={sessionId} />;
  }

  return null;
}

function StartButton({ sessionId }: { sessionId: string }) {
  const { isDisabled, warningMessage } = useListenButtonState(sessionId);
  const handleClick = useStartListening(sessionId);
  const openNew = useTabs((state) => state.openNew);

  const handleConfigureAction = useCallback(() => {
    openNew({ type: "ai", state: { tab: "transcription" } });
  }, [openNew]);

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn([
        "inline-flex items-center justify-center rounded-md text-xs font-medium",
        "bg-white text-neutral-900 hover:bg-neutral-100",
        "gap-1.5",
        "h-7 px-2",
        "disabled:pointer-events-none disabled:opacity-50",
      ])}
    >
      <span className="whitespace-nowrap text-neutral-900 hover:text-neutral-800">
        Resume listening
      </span>
    </button>
  );

  if (!warningMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Make Char listen to your meeting
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="inline-block">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <ActionableTooltipContent
          message={warningMessage}
          action={{
            label: "Configure",
            handleClick: handleConfigureAction,
          }}
        />
      </TooltipContent>
    </Tooltip>
  );
}

function DancingSticksIndicator({ sessionId }: { sessionId: string }) {
  const { mode, amplitude, muted } = useListener((state) => ({
    mode: state.getSessionMode(sessionId),
    amplitude: state.live.amplitude,
    muted: state.live.muted,
  }));

  const active = mode === "active";

  if (!active) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2">
      {muted && <MicOff size={14} className="text-red-500" />}
      <DancingSticks
        amplitude={Math.min((amplitude.mic + amplitude.speaker) / 2000, 1)}
        color="#ef4444"
        height={18}
        width={60}
      />
    </div>
  );
}
