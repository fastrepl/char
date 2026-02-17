import { HeadsetIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useListener } from "../../../../../contexts/listener";
import { useShell } from "../../../../../contexts/shell";
import { useSessionEvent } from "../../../../../hooks/tinybase";
import { useEventCountdown } from "../../../../../hooks/useEventCountdown";
import { useStartListening } from "../../../../../hooks/useStartListening";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { RecordingIcon, useListenButtonState } from "../shared";
import { OptionsMenu } from "./options-menu";
import { ActionableTooltipContent, FloatingButton } from "./shared";

export function ListenButton({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const { shouldRender } = useListenButtonState(tab.id);
  const { loading, stop } = useListener((state) => ({
    loading: state.live.loading,
    stop: state.stop,
  }));

  if (loading) {
    return (
      <FloatingButton onClick={stop}>
        <Spinner />
      </FloatingButton>
    );
  }

  if (shouldRender) {
    return <BeforeMeeingButton tab={tab} />;
  }

  return null;
}

function BeforeMeeingButton({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const remote = useRemoteMeeting(tab.id);

  const { isDisabled, warningMessage } = useListenButtonState(tab.id);
  const startListening = useStartListening(tab.id);

  const handleJoin = useCallback(() => {
    if (remote?.url) {
      void openerCommands.openUrl(remote.url, null);
    }
  }, [remote?.url]);

  if (remote) {
    return (
      <SplitMeetingButtons
        remote={remote}
        disabled={isDisabled}
        warningMessage={warningMessage}
        onJoin={handleJoin}
        onStartListening={startListening}
        sessionId={tab.id}
      />
    );
  }

  return (
    <ListenSplitButton
      content={
        <>
          <span className="flex items-center gap-2 pl-3">
            <RecordingIcon /> Start listening
          </span>
        </>
      }
      disabled={isDisabled}
      warningMessage={warningMessage}
      onPrimaryClick={startListening}
      sessionId={tab.id}
    />
  );
}

const SIDEBAR_WIDTH = 280;
const LAYOUT_PADDING = 4;
const EDITOR_WIDTH_THRESHOLD = 590;

function SplitMeetingButtons({
  remote,
  disabled,
  warningMessage,
  onJoin,
  onStartListening,
  sessionId,
}: {
  remote: RemoteMeeting;
  disabled: boolean;
  warningMessage: string;
  onJoin: () => void;
  onStartListening: () => void;
  sessionId: string;
}) {
  const openNew = useTabs((state) => state.openNew);
  const countdown = useEventCountdown(sessionId);
  const { leftsidebar } = useShell();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const calculateIsNarrow = () => {
      const sidebarOffset = leftsidebar.expanded
        ? SIDEBAR_WIDTH + LAYOUT_PADDING
        : 0;
      const availableWidth = window.innerWidth - sidebarOffset;
      setIsNarrow(availableWidth < EDITOR_WIDTH_THRESHOLD);
    };

    calculateIsNarrow();
    window.addEventListener("resize", calculateIsNarrow);
    return () => window.removeEventListener("resize", calculateIsNarrow);
  }, [leftsidebar.expanded]);

  const handleConfigure = useCallback(() => {
    onStartListening();
    openNew({ type: "ai", state: { tab: "transcription" } });
  }, [onStartListening, openNew]);

  const getMeetingIcon = () => {
    switch (remote.type) {
      case "zoom":
        return <img src="/assets/zoom.png" width={20} height={20} />;
      case "google-meet":
        return <img src="/assets/meet.png" width={20} height={20} />;
      case "webex":
        return <img src="/assets/webex.png" width={20} height={20} />;
      case "teams":
        return <img src="/assets/teams.png" width={20} height={20} />;
      default:
        return <HeadsetIcon size={20} />;
    }
  };

  const getMeetingName = () => {
    switch (remote.type) {
      case "zoom":
        return "Zoom";
      case "google-meet":
        return "Meet";
      case "webex":
        return "Webex";
      case "teams":
        return "Teams";
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {!isNarrow && (
        <FloatingButton
          onClick={onJoin}
          className="justify-center gap-2 h-10 px-3 lg:px-4 bg-linear-to-b from-white to-neutral-50 hover:from-neutral-50 hover:to-neutral-100 text-neutral-800 border-neutral-200 shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
        >
          <span>Join</span>
          {getMeetingIcon()}
          <span>{getMeetingName()}</span>
        </FloatingButton>
      )}
      <OptionsMenu
        sessionId={sessionId}
        disabled={disabled}
        warningMessage={warningMessage}
        onConfigure={handleConfigure}
      >
        <FloatingButton
          onClick={onStartListening}
          disabled={disabled}
          className="justify-center gap-2 pl-3 pr-8 lg:pl-4 lg:pr-10 bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white border-stone-600 shadow-[0_4px_14px_rgba(87,83,78,0.4)]"
          tooltip={
            warningMessage
              ? {
                  side: "top",
                  content: (
                    <ActionableTooltipContent
                      message={warningMessage}
                      action={{
                        label: "Configure",
                        handleClick: handleConfigure,
                      }}
                    />
                  ),
                }
              : undefined
          }
        >
          <span className="flex items-center gap-2 pl-3">
            <RecordingIcon /> Start listening
          </span>
        </FloatingButton>
      </OptionsMenu>
      {countdown && (
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap text-xs text-neutral-500">
          {countdown}
        </div>
      )}
    </div>
  );
}

function ListenSplitButton({
  content,
  disabled,
  warningMessage,
  onPrimaryClick,
  sessionId,
}: {
  content: React.ReactNode;
  disabled: boolean;
  warningMessage: string;
  onPrimaryClick: () => void;
  sessionId: string;
}) {
  const openNew = useTabs((state) => state.openNew);
  const countdown = useEventCountdown(sessionId);

  const handleAction = useCallback(() => {
    onPrimaryClick();
    openNew({ type: "ai", state: { tab: "transcription" } });
  }, [onPrimaryClick, openNew]);

  return (
    <div className="relative">
      <OptionsMenu
        sessionId={sessionId}
        disabled={disabled}
        warningMessage={warningMessage}
        onConfigure={handleAction}
      >
        <FloatingButton
          onClick={onPrimaryClick}
          disabled={disabled}
          className="justify-center gap-2 pl-3 pr-8 lg:pl-4 lg:pr-10 bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white border-stone-600 shadow-[0_4px_14px_rgba(87,83,78,0.4)]"
          tooltip={
            warningMessage
              ? {
                  side: "top",
                  content: (
                    <ActionableTooltipContent
                      message={warningMessage}
                      action={{
                        label: "Configure",
                        handleClick: handleAction,
                      }}
                    />
                  ),
                }
              : undefined
          }
        >
          {content}
        </FloatingButton>
      </OptionsMenu>
      {countdown && (
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap text-xs text-neutral-500">
          {countdown}
        </div>
      )}
    </div>
  );
}

type RemoteMeeting = {
  type: "zoom" | "google-meet" | "webex" | "teams";
  url: string;
};

function detectMeetingType(
  url: string,
): "zoom" | "google-meet" | "webex" | "teams" | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes("zoom.us")) {
      return "zoom";
    }
    if (hostname.includes("meet.google.com")) {
      return "google-meet";
    }
    if (hostname.includes("webex.com")) {
      return "webex";
    }
    if (hostname.includes("teams.microsoft.com")) {
      return "teams";
    }
    return null;
  } catch {
    return null;
  }
}

function useRemoteMeeting(sessionId: string): RemoteMeeting | null {
  const event = useSessionEvent(sessionId);
  const meetingLink = event?.meeting_link ?? null;

  if (!meetingLink) {
    return null;
  }

  const type = detectMeetingType(meetingLink);
  if (!type) {
    return null;
  }

  return { type, url: meetingLink };
}
