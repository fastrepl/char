import { CalendarOffIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

export interface CalendarItem {
  id: string;
  title: string;
  color: string;
  enabled: boolean;
}

export interface CalendarGroup {
  sourceName: string;
  calendars: CalendarItem[];
}

interface CalendarSelectionProps {
  groups: CalendarGroup[];
  onToggle: (calendar: CalendarItem, enabled: boolean) => void;
  className?: string;
  isLoading?: boolean;
}

export function CalendarSelection({
  groups,
  onToggle,
  className,
  isLoading,
}: CalendarSelectionProps) {
  const defaultOpen = useMemo(
    () =>
      groups
        .filter((g) => g.calendars.some((c) => c.enabled))
        .map((g) => g.sourceName),
    [groups],
  );

  if (groups.length === 0) {
    return (
      <div
        className={cn([
          "flex flex-col items-center justify-center py-6 px-4",
          className,
        ])}
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-6 text-neutral-300 mb-2 animate-spin" />
            <p className="text-xs text-neutral-500">Loading calendars…</p>
          </>
        ) : (
          <>
            <CalendarOffIcon className="size-6 text-neutral-300 mb-2" />
            <p className="text-xs text-neutral-500">No calendars found</p>
          </>
        )}
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen}
      className={cn(["divide-y", className])}
    >
      {groups.map((group) => {
        const enabledCount = group.calendars.filter((c) => c.enabled).length;

        return (
          <AccordionItem
            key={group.sourceName}
            value={group.sourceName}
            className="border-none px-2"
          >
            <AccordionTrigger
              className={cn([
                "py-2 cursor-pointer hover:no-underline",
                "hover:bg-neutral-50 -mx-2 px-2 rounded-md",
              ])}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-600">
                  {group.sourceName}
                </span>
                <span className="text-[10px] tabular-nums text-neutral-400">
                  {enabledCount}/{group.calendars.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="flex flex-col gap-1">
                {group.calendars.map((cal) => (
                  <CalendarToggleRow
                    key={cal.id}
                    calendar={cal}
                    enabled={cal.enabled}
                    onToggle={(enabled) => onToggle(cal, enabled)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function CalendarToggleRow({
  calendar,
  enabled,
  onToggle,
}: {
  calendar: CalendarItem;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const color = calendar.color ?? "#888";

  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="flex items-center gap-2 py-1 w-full text-left"
    >
      <div
        className={cn([
          "size-4 rounded shrink-0 flex items-center justify-center border",
          "transition-colors duration-100",
        ])}
        style={
          enabled
            ? { backgroundColor: color, borderColor: color }
            : { borderColor: "#d4d4d4" }
        }
      >
        {enabled && <CheckIcon className="size-3 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm truncate">{calendar.title}</span>
    </button>
  );
}
