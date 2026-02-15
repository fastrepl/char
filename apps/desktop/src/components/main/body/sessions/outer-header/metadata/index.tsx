import { CalendarIcon, MapPinIcon, VideoIcon } from "lucide-react";
import { forwardRef, useState } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  cn,
  differenceInDays,
  safeFormat,
  safeParseDate,
  startOfDay,
  TZDate,
} from "@hypr/utils";

import { useConfigValue } from "../../../../../../config/use-config";
import { useSessionEvent } from "../../../../../../hooks/tinybase";
import * as main from "../../../../../../store/tinybase/store/main";
import { DateDisplay } from "./date";
import { ParticipantsDisplay } from "./participants";

export function MetadataButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TriggerInner sessionId={sessionId} open={open} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-85 shadow-lg p-0 max-h-[80vh] flex flex-col rounded-lg"
      >
        <ContentInner sessionId={sessionId} />
      </PopoverContent>
    </Popover>
  );
}

const TriggerInner = forwardRef<
  HTMLButtonElement,
  { sessionId: string; open?: boolean }
>(({ sessionId, open, ...props }, ref) => {
  const createdAt = main.UI.useCell(
    "sessions",
    sessionId,
    "created_at",
    main.STORE_ID,
  );
  const sessionEvent = useSessionEvent(sessionId);

  const hasEvent = !!sessionEvent;
  const parsedDate = safeParseDate(createdAt);
  const displayText = hasEvent
    ? sessionEvent.title || "Untitled Event"
    : formatRelativeOrAbsolute(parsedDate ?? new Date());

  return (
    <Button
      ref={ref}
      {...props}
      variant="ghost"
      size="sm"
      className={cn([
        "text-neutral-600 hover:text-black",
        open && "bg-neutral-100",
        hasEvent && "max-w-50",
      ])}
    >
      {hasEvent && sessionEvent?.meeting_link ? (
        <VideoIcon size={14} className="shrink-0" />
      ) : (
        <CalendarIcon size={14} className="shrink-0" />
      )}
      <span className={cn([hasEvent && "truncate"])}>{displayText}</span>
    </Button>
  );
});

function ContentInner({ sessionId }: { sessionId: string }) {
  const sessionEvent = useSessionEvent(sessionId);

  const eventDisplayData = sessionEvent
    ? {
        title: sessionEvent.title,
        startedAt: sessionEvent.started_at,
        endedAt: sessionEvent.ended_at,
        location: sessionEvent.location,
        meetingLink: sessionEvent.meeting_link,
        description: sessionEvent.description,
        calendarId: sessionEvent.calendar_id,
      }
    : null;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {eventDisplayData && <EventDisplay event={eventDisplayData} />}
      {!eventDisplayData && <DateDisplay sessionId={sessionId} />}
      <ParticipantsDisplay sessionId={sessionId} />
    </div>
  );
}

export function EventDisplay({
  event,
}: {
  event: {
    title: string | undefined;
    startedAt: string | undefined;
    endedAt: string | undefined;
    location: string | undefined;
    meetingLink: string | undefined;
    description: string | undefined;
    calendarId: string | undefined;
  };
}) {
  const tz = useConfigValue("timezone") || undefined;

  const handleJoinMeeting = () => {
    if (event.meetingLink) {
      void openerCommands.openUrl(event.meetingLink, null);
    }
  };

  const toTz = (date: Date): Date => (tz ? new TZDate(date, tz) : date);

  const formatEventDateTime = () => {
    if (!event.startedAt) {
      return "";
    }

    const rawStart = safeParseDate(event.startedAt);
    const rawEnd = event.endedAt ? safeParseDate(event.endedAt) : null;

    if (!rawStart) {
      return "";
    }

    const startDate = toTz(rawStart);
    const endDate = rawEnd ? toTz(rawEnd) : null;

    const startStr = safeFormat(startDate, "MMM d, yyyy h:mm a");
    if (!endDate) {
      return startStr;
    }

    const sameDay = startDate.toDateString() === endDate.toDateString();
    const endStr = sameDay
      ? safeFormat(endDate, "h:mm a")
      : safeFormat(endDate, "MMM d, yyyy h:mm a");

    return `${startStr} to ${endStr}`;
  };

  const getMeetingLinkDomain = () => {
    if (!event.meetingLink) {
      return null;
    }
    try {
      const url = new URL(event.meetingLink);
      return url.hostname.replace("www.", "");
    } catch {
      return null;
    }
  };

  const meetingDomain = getMeetingLinkDomain();

  const isLocationURL = (location: string) => {
    try {
      new URL(location);
      return true;
    } catch {
      return false;
    }
  };

  const shouldShowLocation = event.location && !isLocationURL(event.location);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-medium text-neutral-900">
        {event.title || "Untitled Event"}
      </div>

      <div className="h-px bg-neutral-200" />

      {shouldShowLocation && (
        <>
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <MapPinIcon size={16} className="shrink-0 text-neutral-500" />
            <span>{event.location}</span>
          </div>
        </>
      )}

      {event.meetingLink && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-neutral-700 min-w-0">
              <VideoIcon size={16} className="shrink-0 text-neutral-500" />
              <span className="truncate">
                {meetingDomain || "Meeting link"}
              </span>
            </div>
            <Button
              size="sm"
              variant="default"
              className="shrink-0"
              onClick={handleJoinMeeting}
            >
              Join
            </Button>
          </div>
        </>
      )}

      {event.startedAt && (
        <div className="text-sm text-neutral-700">{formatEventDateTime()}</div>
      )}

      {event.description && (
        <>
          <div className="h-px bg-neutral-200" />
          <div className="text-sm text-neutral-700 whitespace-pre-wrap break-words">
            {event.description}
          </div>
        </>
      )}
    </div>
  );
}

function formatRelativeOrAbsolute(date: Date): string {
  const now = startOfDay(new Date());
  const targetDay = startOfDay(date);
  const daysDiff = differenceInDays(targetDay, now);
  const absDays = Math.abs(daysDiff);

  if (daysDiff === 0) {
    return "Today";
  }
  if (daysDiff === -1) {
    return "Yesterday";
  }
  if (daysDiff === 1) {
    return "Tomorrow";
  }

  if (daysDiff < 0 && absDays <= 6) {
    return `${absDays} days ago`;
  }

  if (daysDiff < 0 && absDays <= 27) {
    const weeks = Math.max(1, Math.round(absDays / 7));
    return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
  }

  return safeFormat(date, "MMM d, yyyy", "Unknown date");
}
