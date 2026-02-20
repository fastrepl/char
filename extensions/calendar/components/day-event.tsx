import clsx from "clsx";
import { format, isSameDay } from "date-fns";
import { store, tabs, ui } from "hyprnote";
import { useState } from "react";

import { CalendarIcon, PenIcon, StickyNoteIcon } from "./icons";

const { Button } = ui.button;
const { Popover, PopoverContent, PopoverTrigger } = ui.popover;
const { useTabs } = tabs;

export function DayEvent({ eventId }: { eventId: string }) {
  const event = store.UI.useRow("events", eventId, store.STORE_ID);
  const [open, setOpen] = useState(false);
  const openNew = useTabs((state) => state.openNew);

  const title = (event?.title as string) || "Untitled Event";

  const sessionIds = store.UI.useSliceRowIds(
    store.INDEXES.sessionsByEvent,
    eventId,
    store.STORE_ID,
  );
  const linkedSessionId = sessionIds[0];
  const linkedSession = store.UI.useRow(
    "sessions",
    linkedSessionId || "dummy",
    store.STORE_ID,
  );

  const handleOpenNote = () => {
    setOpen(false);

    if (linkedSessionId) {
      openNew({ type: "sessions", id: linkedSessionId });
    } else {
      openNew({ type: "sessions", id: crypto.randomUUID() });
    }
  };

  const formatEventTime = () => {
    if (!event || !event.started_at || !event.ended_at) {
      return "";
    }
    const start = new Date(event.started_at as string);
    const end = new Date(event.ended_at as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "";
    }

    if (isSameDay(start, end)) {
      return `${format(start, "MMM d")}, ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
    }
    return `${format(start, "MMM d")}, ${format(start, "h:mm a")} - ${format(end, "MMM d")}, ${format(end, "h:mm a")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={clsx([
            "w-full justify-start px-1 text-neutral-600 h-6",
            open && "bg-neutral-100 hover:bg-neutral-100",
          ])}
        >
          <CalendarIcon />
          <p className="truncate">{title}</p>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-hidden focus:outline-hidden focus:ring-0">
        <div className="font-semibold text-lg text-neutral-800 mb-2">
          {title}
        </div>

        <p className="text-sm text-neutral-600 mb-4">{formatEventTime()}</p>

        {linkedSessionId ? (
          <Button className="w-full justify-start" onClick={handleOpenNote}>
            <StickyNoteIcon />
            <p className="truncate">
              {(linkedSession?.title as string) || "Untitled Note"}
            </p>
          </Button>
        ) : (
          <Button className="w-full" onClick={handleOpenNote}>
            <PenIcon />
            Create Note
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
