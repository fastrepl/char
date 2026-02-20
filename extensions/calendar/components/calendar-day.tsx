import clsx from "clsx";
import { format, getDay } from "date-fns";
import { store } from "hyprnote";
import { useEffect, useRef, useState } from "react";

import { DayEvent } from "./day-event";
import { DayMore } from "./day-more";
import { DaySession } from "./day-session";
import { parseLocalDate } from "./utils";

export function CalendarDay({
  day,
  isCurrentMonth,
  isFirstColumn,
  isLastRow,
  selectedCalendars,
}: {
  day: string;
  isCurrentMonth: boolean;
  isFirstColumn: boolean;
  isLastRow: boolean;
  selectedCalendars: Set<string>;
}) {
  const cellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxVisibleItems, setMaxVisibleItems] = useState(5);

  const allEventIds = store.UI.useSliceRowIds(
    store.INDEXES.eventsByDate,
    day,
    store.STORE_ID,
  );

  const storeInstance = store.UI.useStore(store.STORE_ID);

  const eventIds = allEventIds.filter((eventId) => {
    const event = storeInstance?.getRow("events", eventId);
    return (
      event?.calendar_id && selectedCalendars.has(event.calendar_id as string)
    );
  });

  const sessionIds = store.UI.useSliceRowIds(
    store.INDEXES.sessionByDateWithoutEvent,
    day,
    store.STORE_ID,
  );

  const dayDate = parseLocalDate(day);
  const dayNumber = format(dayDate, "d");
  const isToday = format(new Date(), "yyyy-MM-dd") === day;
  const dayOfWeek = getDay(dayDate);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  useEffect(() => {
    const measureHeight = () => {
      if (cellRef.current && contentRef.current) {
        const cellHeight = cellRef.current.clientHeight;
        const contentTop = contentRef.current.offsetTop;
        const availableHeight = cellHeight - contentTop;
        const EVENT_HEIGHT = 20;
        const SPACING = 4;

        const itemsWithSpacing = Math.floor(
          (availableHeight + SPACING) / (EVENT_HEIGHT + SPACING),
        );
        setMaxVisibleItems(Math.max(1, itemsWithSpacing));
      }
    };

    measureHeight();

    window.addEventListener("resize", measureHeight);
    return () => window.removeEventListener("resize", measureHeight);
  }, []);

  const totalItems = eventIds.length + sessionIds.length;
  const visibleCount =
    totalItems > maxVisibleItems ? maxVisibleItems - 1 : totalItems;
  const hiddenCount = totalItems - visibleCount;

  const allItems = [
    ...eventIds.map((id) => ({ type: "event" as const, id })),
    ...sessionIds.map((id) => ({ type: "session" as const, id })),
  ];

  const visibleItems = allItems.slice(0, visibleCount);
  const hiddenItems = allItems.slice(visibleCount);

  const hiddenEventIds = hiddenItems
    .filter((item) => item.type === "event")
    .map((item) => item.id);
  const hiddenSessionIds = hiddenItems
    .filter((item) => item.type === "session")
    .map((item) => item.id);

  return (
    <div
      ref={cellRef}
      className={clsx([
        "relative flex flex-col items-end flex-1 min-w-0 border-neutral-200 p-1 overflow-hidden",
        !isFirstColumn && "border-l",
        !isLastRow && "border-b",
        isWeekend ? "bg-neutral-50" : "bg-white",
      ])}
    >
      <div
        className={clsx([
          "text-sm size-6 rounded-full flex items-center justify-center mb-1",
          isToday && "bg-red-500",
        ])}
      >
        <span
          className={clsx([
            isToday && "text-white font-medium",
            !isToday && !isCurrentMonth && "text-neutral-400",
            !isToday && isCurrentMonth && isWeekend && "text-neutral-500",
            !isToday && isCurrentMonth && !isWeekend && "text-neutral-700",
          ])}
        >
          {dayNumber}
        </span>
      </div>

      <div ref={contentRef} className="flex-1 w-full">
        {visibleItems.map((item) =>
          item.type === "event" ? (
            <DayEvent key={item.id} eventId={item.id} />
          ) : (
            <DaySession key={item.id} sessionId={item.id} />
          ),
        )}

        {hiddenCount > 0 && (
          <DayMore
            day={day}
            eventIds={hiddenEventIds}
            sessionIds={hiddenSessionIds}
            hiddenCount={hiddenCount}
          />
        )}
      </div>
    </div>
  );
}
