import { forwardRef, useEffect, useState } from "react";
import { getSessionEvent } from "~/session/utils";

import { safeParseDate } from "@hypr/utils";

import type { TimelineEventsTable, TimelineSessionsTable } from "./utils";

export const CurrentTimeIndicator = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="py-0.5" aria-hidden />
));

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
