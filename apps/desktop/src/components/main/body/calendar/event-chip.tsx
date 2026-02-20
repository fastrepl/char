import { format } from "date-fns";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import { useEvent } from "../../../../hooks/tinybase";
import * as main from "../../../../store/tinybase/store/main";
import { getOrCreateSessionForEventId } from "../../../../store/tinybase/store/sessions";
import { useTabs } from "../../../../store/zustand/tabs";
import { EventDisplay } from "../sessions/outer-header/metadata";
import { toTz, useTimezone } from "./hooks";

function useCalendarColor(calendarId: string | null): string | null {
  const calendar = main.UI.useRow("calendars", calendarId ?? "", main.STORE_ID);
  if (!calendarId) return null;
  return calendar?.color ? String(calendar.color) : null;
}

export function EventChip({ eventId }: { eventId: string }) {
  const tz = useTimezone();
  const event = main.UI.useResultRow(
    main.QUERIES.timelineEvents,
    eventId,
    main.STORE_ID,
  );
  const calendarColor = useCalendarColor(
    (event?.calendar_id as string) ?? null,
  );

  if (!event || !event.title) {
    return null;
  }

  const isAllDay = !!event.is_all_day;
  const color = calendarColor ?? "#888";

  const startedAt = event.started_at
    ? format(toTz(event.started_at as string, tz), "h:mm a")
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {isAllDay ? (
          <button
            className={cn([
              "text-xs leading-tight truncate rounded px-1.5 py-0.5 text-left w-full text-white",
              "hover:opacity-80 cursor-pointer",
            ])}
            style={{ backgroundColor: color }}
          >
            {event.title as string}
          </button>
        ) : (
          <button
            className={cn([
              "flex items-center gap-1 pl-0.5 text-xs leading-tight rounded text-left w-full",
              "hover:opacity-80 cursor-pointer",
            ])}
          >
            <div
              className="w-[2.5px] self-stretch rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{event.title as string}</span>
            {startedAt && (
              <span className="text-neutral-400 ml-auto shrink-0 font-mono">
                {startedAt}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] shadow-lg p-0 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <EventPopoverContent eventId={eventId} />
      </PopoverContent>
    </Popover>
  );
}

function EventPopoverContent({ eventId }: { eventId: string }) {
  const event = useEvent(eventId);
  const store = main.UI.useStore(main.STORE_ID);
  const openNew = useTabs((state) => state.openNew);
  const tz = useTimezone();

  const eventRow = main.UI.useResultRow(
    main.QUERIES.timelineEvents,
    eventId,
    main.STORE_ID,
  );

  const handleOpen = useCallback(() => {
    if (!store) return;
    const title = (eventRow?.title as string) || "Untitled";
    const sessionId = getOrCreateSessionForEventId(store, eventId, title, tz);
    openNew({ type: "sessions", id: sessionId });
  }, [store, eventId, eventRow?.title, openNew, tz]);

  if (!event) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <EventDisplay event={event} />
      <Button
        size="sm"
        className="w-full min-h-8 bg-stone-800 hover:bg-stone-700 text-white"
        onClick={handleOpen}
      >
        Open note
      </Button>
    </div>
  );
}
