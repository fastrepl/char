import { format } from "date-fns";
import { ui } from "char";
import { useState } from "react";

import { DayEvent } from "./day-event";
import { DaySession } from "./day-session";
import { parseLocalDate } from "./utils";

const { Button } = ui.button;
const { Popover, PopoverContent, PopoverTrigger } = ui.popover;

export function DayMore({
  day,
  eventIds,
  sessionIds,
  hiddenCount,
}: {
  day: string;
  eventIds: string[];
  sessionIds: string[];
  hiddenCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-1 text-neutral-600 h-6"
        >
          +{hiddenCount} more
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 max-h-96 flex flex-col gap-2 overflow-y-auto bg-white border-neutral-200 m-2 shadow-lg outline-hidden focus:outline-hidden focus:ring-0"
        align="start"
      >
        <div className="text-lg font-semibold text-neutral-800 mb-2">
          {format(parseLocalDate(day), "MMMM d, yyyy")}
        </div>

        <div className="flex flex-col gap-1">
          {eventIds.map((eventId) => (
            <DayEvent key={eventId} eventId={eventId} />
          ))}
          {sessionIds.map((sessionId) => (
            <DaySession key={sessionId} sessionId={sessionId} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
