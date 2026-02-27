import { format } from "date-fns";
import { useCallback } from "react";
import { toTz, useTimezone } from "~/calendar/hooks";
import * as main from "~/store/tinybase/store/main";
import { useTabs } from "~/store/zustand/tabs";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

export function SessionChip({ sessionId }: { sessionId: string }) {
  const tz = useTimezone();
  const session = main.UI.useResultRow(
    main.QUERIES.timelineSessions,
    sessionId,
    main.STORE_ID,
  );

  if (!session || !session.title) {
    return null;
  }

  const createdAt = session.created_at
    ? format(toTz(session.created_at as string, tz), "h:mm a")
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn([
            "flex items-center gap-1 pl-0.5 text-xs leading-tight rounded text-left w-full",
            "hover:opacity-80 cursor-pointer",
          ])}
        >
          <div className="w-[2.5px] self-stretch rounded-full shrink-0 bg-blue-500" />
          <span className="truncate">{session.title as string}</span>
          {createdAt && (
            <span className="text-neutral-400 ml-auto shrink-0 font-mono">
              {createdAt}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] shadow-lg p-0 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <SessionPopoverContent sessionId={sessionId} />
      </PopoverContent>
    </Popover>
  );
}

function SessionPopoverContent({ sessionId }: { sessionId: string }) {
  const session = main.UI.useResultRow(
    main.QUERIES.timelineSessions,
    sessionId,
    main.STORE_ID,
  );
  const openNew = useTabs((state) => state.openNew);
  const tz = useTimezone();

  const handleOpen = useCallback(() => {
    openNew({ type: "sessions", id: sessionId });
  }, [openNew, sessionId]);

  if (!session) {
    return null;
  }

  const createdAt = session.created_at
    ? format(toTz(session.created_at as string, tz), "MMM d, yyyy h:mm a")
    : null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="text-base font-medium text-neutral-900">
        {session.title as string}
      </div>
      <div className="h-px bg-neutral-200" />
      {createdAt && <div className="text-sm text-neutral-700">{createdAt}</div>}
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
