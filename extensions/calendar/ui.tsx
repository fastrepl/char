import clsx from "clsx";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
  subDays,
} from "date-fns";
import type { ExtensionViewProps } from "char";
import { store, ui } from "char";
import { useEffect, useState } from "react";

import { CalendarCheckboxRow } from "./components/calendar-checkbox-row";
import { CalendarDay } from "./components/calendar-day";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./components/icons";
import { parseLocalDate } from "./components/utils";

const { Button } = ui.button;
const { ButtonGroup } = ui.buttonGroup;

export default function CalendarExtensionView({
  extensionId: _extensionId,
  state,
}: ExtensionViewProps) {
  const [month, setMonth] = useState(() => {
    if (state?.month && typeof state.month === "string") {
      return new Date(state.month);
    }
    return new Date();
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const calendarIds = store.UI.useRowIds("calendars", store.STORE_ID);

  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(
    () => new Set(calendarIds),
  );

  useEffect(() => {
    setSelectedCalendars((prev) => {
      const next = new Set(prev);
      for (const id of calendarIds) {
        if (!prev.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [calendarIds]);

  const monthStart = startOfMonth(month);
  const startDayOfWeek = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = format(month, "MMMM yyyy");

  const calendarStart = subDays(monthStart, startDayOfWeek);
  const totalCells = 42;
  const calendarEnd = addDays(calendarStart, totalCells - 1);
  const allDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  }).map((day) => format(day, "yyyy-MM-dd"));

  const handlePreviousMonth = () => {
    setMonth(addMonths(month, -1));
  };

  const handleNextMonth = () => {
    setMonth(addMonths(month, 1));
  };

  const handleToday = () => {
    setMonth(new Date());
  };

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col">
          <div className="p-2 text-sm border-b border-neutral-200 flex items-center gap-2">
            <Button
              size="icon"
              variant={sidebarOpen ? "default" : "ghost"}
              onClick={() => setSidebarOpen(false)}
            >
              <CalendarDaysIcon />
            </Button>
            My Calendars
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {calendarIds.map((id) => (
                <CalendarCheckboxRow
                  key={id}
                  id={id}
                  checked={selectedCalendars.has(id)}
                  onToggle={(checked) => {
                    if (checked) {
                      setSelectedCalendars((prev) => new Set([...prev, id]));
                    } else {
                      setSelectedCalendars((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0">
          <div className="p-2 flex items-center relative">
            {!sidebarOpen && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarOpen(true)}
              >
                <CalendarDaysIcon />
              </Button>
            )}
            <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
              {monthLabel}
            </div>
            <ButtonGroup className="ml-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="shadow-none"
              >
                <ChevronLeftIcon />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-sm px-3 shadow-none"
                onClick={handleToday}
              >
                Today
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="shadow-none"
              >
                <ChevronRightIcon />
              </Button>
            </ButtonGroup>
          </div>

          <div className="grid grid-cols-7 border-b border-neutral-200">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={clsx([
                  "text-center text-sm font-medium p-2",
                  index === 0 || index === 6 ? "text-black/70" : "text-black",
                ])}
              >
                {day}
              </div>
            ))}
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-1 min-h-0">
              {allDays
                .slice(weekIndex * 7, (weekIndex + 1) * 7)
                .map((day, dayIndex) => (
                  <CalendarDay
                    key={day}
                    day={day}
                    isCurrentMonth={isSameMonth(parseLocalDate(day), month)}
                    isFirstColumn={dayIndex === 0}
                    isLastRow={weekIndex === 5}
                    selectedCalendars={selectedCalendars}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
