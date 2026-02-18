import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import { EventChip } from "./event-chip";
import type { CalendarData } from "./hooks";
import { useNow } from "./hooks";
import { SessionChip } from "./session-chip";

function useVisibleItemCount(
  ref: React.RefObject<HTMLDivElement | null>,
  totalItems: number,
) {
  const [maxVisible, setMaxVisible] = useState(totalItems);

  useEffect(() => {
    const el = ref.current;
    if (!el || totalItems === 0) return;

    const compute = () => {
      const available = el.clientHeight;
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0 || available <= 0) return;

      const chipH = children[0].offsetHeight;
      if (chipH === 0) return;

      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;

      const allH = totalItems * chipH + Math.max(0, totalItems - 1) * gap;
      if (allH <= available) {
        setMaxVisible((prev) => (prev === totalItems ? prev : totalItems));
        return;
      }

      const overflowH = chipH;
      let count = 0;
      let used = 0;

      while (count < totalItems) {
        const next = chipH + (count > 0 ? gap : 0);
        const remaining = totalItems - count - 1;
        const moreSpace = remaining > 0 ? overflowH + gap : 0;
        if (used + next + moreSpace > available) break;
        used += next;
        count++;
      }

      const result = Math.max(1, count);
      setMaxVisible((prev) => (prev === result ? prev : result));
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, totalItems]);

  return maxVisible;
}

export function DayCell({
  day,
  isCurrentMonth,
  calendarData,
}: {
  day: Date;
  isCurrentMonth: boolean;
  calendarData: CalendarData;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const eventIds = calendarData.eventIdsByDate[dateKey] ?? [];
  const sessionIds = calendarData.sessionIdsByDate[dateKey] ?? [];

  const now = useNow();
  const itemsRef = useRef<HTMLDivElement>(null);
  const totalItems = eventIds.length + sessionIds.length;
  const maxVisible = useVisibleItemCount(itemsRef, totalItems);
  const today = format(day, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

  const visibleEvents = eventIds.slice(0, maxVisible);
  const remainingSlots = Math.max(0, maxVisible - visibleEvents.length);
  const visibleSessions = sessionIds.slice(0, remainingSlots);
  const shownCount = visibleEvents.length + visibleSessions.length;
  const overflow = totalItems - shownCount;

  return (
    <div
      className={cn([
        "border-b border-r border-neutral-100",
        "p-1.5 min-w-0 flex flex-col",
        (day.getDay() === 0 || day.getDay() === 6) && "bg-neutral-50",
      ])}
    >
      <div className="flex justify-end shrink-0">
        <div
          className={cn([
            "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
            today && "bg-neutral-900 text-white",
            !today && !isCurrentMonth && "text-neutral-300",
            !today &&
              isCurrentMonth &&
              (day.getDay() === 0 || day.getDay() === 6) &&
              "text-neutral-400",
            !today &&
              isCurrentMonth &&
              day.getDay() !== 0 &&
              day.getDay() !== 6 &&
              "text-neutral-900",
          ])}
        >
          {format(day, "d")}
        </div>
      </div>
      <div
        ref={itemsRef}
        className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden"
      >
        {visibleEvents.map((eventId) => (
          <EventChip key={eventId} eventId={eventId} />
        ))}
        {visibleSessions.map((sessionId) => (
          <SessionChip key={sessionId} sessionId={sessionId} />
        ))}
        {overflow > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-neutral-400 pl-1 text-left hover:text-neutral-600 cursor-pointer shrink-0">
                +{overflow} more
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[220px] shadow-lg p-2 rounded-lg max-h-[300px] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-medium text-neutral-900 mb-2">
                {format(day, "MMM d, yyyy")}
              </div>
              <div className="flex flex-col gap-0.5">
                {eventIds.map((eventId) => (
                  <EventChip key={eventId} eventId={eventId} />
                ))}
                {sessionIds.map((sessionId) => (
                  <SessionChip key={sessionId} sessionId={sessionId} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
