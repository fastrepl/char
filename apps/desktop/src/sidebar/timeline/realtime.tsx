import { forwardRef, useEffect, useMemo, useState } from "react";

import { TZDate, format, safeParseDate } from "@hypr/utils";

import type { TimelineEventsTable, TimelineSessionsTable } from "./utils";

import { getSessionEvent } from "~/session/utils";

export const CurrentTimeIndicator = forwardRef<
  HTMLDivElement,
  { timezone?: string }
>(function CurrentTimeIndicator({ timezone }, ref) {
  const currentTimeMs = useCurrentTimeMs();
  const label = useMemo(() => {
    const now = timezone
      ? new TZDate(new Date(currentTimeMs), timezone)
      : new Date(currentTimeMs);
    return format(now, "h:mm");
  }, [currentTimeMs, timezone]);

  return (
    <div ref={ref} aria-label={`Current time ${label}`} className="px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs">
          {label}
        </div>
        <div className="h-px flex-1 bg-red-400" />
      </div>
    </div>
  );
});

export function useCurrentTimeMs() {
  const [now, setNow] = useState(() => new Date().getTime());

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      setNow(now);
    };

    update();

    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

export function useSmartCurrentTime(
  eventsTable: TimelineEventsTable,
  sessionsTable: TimelineSessionsTable,
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    const scheduleNext = () => {
      const currentTime = Date.now();
      setNow(currentTime);

      const importantTimes: number[] = [];

      if (eventsTable) {
        Object.values(eventsTable).forEach((event) => {
          const startTime = safeParseDate(event.started_at);
          const endTime = safeParseDate(event.ended_at);

          if (startTime && startTime.getTime() > currentTime) {
            importantTimes.push(startTime.getTime());
          }
          if (endTime && endTime.getTime() > currentTime) {
            importantTimes.push(endTime.getTime());
          }
        });
      }

      if (sessionsTable) {
        Object.values(sessionsTable).forEach((session) => {
          const time = safeParseDate(
            getSessionEvent(session)?.started_at ?? session.created_at,
          );
          if (time && time.getTime() > currentTime) {
            importantTimes.push(time.getTime());
          }
        });
      }

      let nextUpdateDelay: number;
      if (importantTimes.length > 0) {
        const nextTime = Math.min(...importantTimes);
        const msUntilNext = nextTime - currentTime;
        nextUpdateDelay = Math.max(100, Math.min(msUntilNext + 100, 60_000));
      } else {
        nextUpdateDelay = 60_000;
      }

      timeoutId = setTimeout(scheduleNext, nextUpdateDelay);
    };

    scheduleNext();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [eventsTable, sessionsTable]);

  return now;
}
