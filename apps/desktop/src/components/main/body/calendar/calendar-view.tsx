import { platform } from "@tauri-apps/plugin-os";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarCogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { safeParseDate } from "@hypr/utils";
import { cn, TZDate } from "@hypr/utils";

import { useConfigValue } from "../../../../config/use-config";
import { useEvent, useIgnoredEvents } from "../../../../hooks/tinybase";
import { usePermission } from "../../../../hooks/usePermissions";
import * as main from "../../../../store/tinybase/store/main";
import { getOrCreateSessionForEventId } from "../../../../store/tinybase/store/sessions";
import { useTabs } from "../../../../store/zustand/tabs";
import { AppleCalendarSelection } from "../../../settings/calendar/configure/apple/calendar-selection";
import { SyncProvider } from "../../../settings/calendar/configure/apple/context";
import { AccessPermissionRow } from "../../../settings/calendar/configure/apple/permission";
import { PROVIDERS } from "../../../settings/calendar/shared";
import { EventDisplay } from "../sessions/outer-header/metadata";

const WEEKDAY_HEADERS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_HEADERS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const VIEW_BREAKPOINTS = [
  { minWidth: 700, cols: 7 },
  { minWidth: 400, cols: 4 },
  { minWidth: 200, cols: 2 },
  { minWidth: 0, cols: 1 },
] as const;

function useVisibleCols(ref: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(7);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const match = VIEW_BREAKPOINTS.find((bp) => width >= bp.minWidth);
      const next = match?.cols ?? 1;
      setCols((prev) => (prev === next ? prev : next));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return cols;
}

function useTimezone() {
  return useConfigValue("timezone") || undefined;
}

function toTz(date: Date | string, tz?: string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return tz ? new TZDate(d, tz) : d;
}

function useNow() {
  const tz = useTimezone();
  const [now, setNow] = useState(() => toTz(new Date(), tz));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(toTz(new Date(), tz));
    }, 60000);
    return () => clearInterval(interval);
  }, [tz]);

  return now;
}

function getSystemWeekStart(): 0 | 1 {
  const locale = navigator.language || "en-US";
  try {
    const options = new Intl.Locale(locale);
    const info = (options as any).getWeekInfo?.() ?? (options as any).weekInfo;
    if (info?.firstDay === 1) return 1;
  } catch {}
  return 0;
}

function useWeekStartsOn(): 0 | 1 {
  const value = useConfigValue("week_start");
  return useMemo(() => {
    if (value === "monday") return 1;
    if (value === "sunday") return 0;
    return getSystemWeekStart();
  }, [value]);
}

type CalendarData = {
  eventIdsByDate: Record<string, string[]>;
  sessionIdsByDate: Record<string, string[]>;
};

function useCalendarData(): CalendarData {
  const tz = useTimezone();

  const eventsTable = main.UI.useResultTable(
    main.QUERIES.timelineEvents,
    main.STORE_ID,
  );
  const sessionsTable = main.UI.useResultTable(
    main.QUERIES.timelineSessions,
    main.STORE_ID,
  );
  const { isIgnored } = useIgnoredEvents();

  return useMemo(() => {
    const eventIdsByDate: Record<string, string[]> = {};
    const sessionIdsByDate: Record<string, string[]> = {};

    if (eventsTable) {
      for (const [eventId, row] of Object.entries(eventsTable)) {
        if (!row.title) continue;
        const raw = safeParseDate(row.started_at);
        if (!raw) continue;
        const day = format(toTz(raw, tz), "yyyy-MM-dd");
        if (isIgnored(row.tracking_id_event, row.recurrence_series_id, day))
          continue;
        (eventIdsByDate[day] ??= []).push(eventId);
      }

      for (const ids of Object.values(eventIdsByDate)) {
        ids.sort((a, b) => {
          const aAllDay = eventsTable[a]?.is_all_day ? 0 : 1;
          const bAllDay = eventsTable[b]?.is_all_day ? 0 : 1;
          return aAllDay - bAllDay;
        });
      }
    }

    if (sessionsTable) {
      for (const [sessionId, row] of Object.entries(sessionsTable)) {
        if (row.event_json || !row.title) continue;
        const raw = safeParseDate(row.created_at);
        if (!raw) continue;
        const key = format(toTz(raw, tz), "yyyy-MM-dd");
        (sessionIdsByDate[key] ??= []).push(sessionId);
      }
    }

    return { eventIdsByDate, sessionIdsByDate };
  }, [eventsTable, sessionsTable, tz, isIgnored]);
}

export function CalendarView() {
  const now = useNow();
  const weekStartsOn = useWeekStartsOn();
  const weekOpts = useMemo(() => ({ weekStartsOn }), [weekStartsOn]);
  const [currentMonth, setCurrentMonth] = useState(now);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now, weekOpts));
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cols = useVisibleCols(containerRef);
  const calendarData = useCalendarData();

  const isMonthView = cols === 7;

  const goToPrev = useCallback(() => {
    if (isMonthView) {
      setCurrentMonth((m) => subMonths(m, 1));
    } else {
      setWeekStart((d) => addDays(d, -cols));
    }
  }, [isMonthView, cols]);

  const goToNext = useCallback(() => {
    if (isMonthView) {
      setCurrentMonth((m) => addMonths(m, 1));
    } else {
      setWeekStart((d) => addDays(d, cols));
    }
  }, [isMonthView, cols]);

  const goToToday = useCallback(() => {
    setCurrentMonth(now);
    setWeekStart(startOfWeek(now, weekOpts));
  }, [now, weekOpts]);

  const days = useMemo(() => {
    if (isMonthView) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calStart = startOfWeek(monthStart, weekOpts);
      const calEnd = endOfWeek(monthEnd, weekOpts);
      return eachDayOfInterval({ start: calStart, end: calEnd });
    }

    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, cols - 1),
    });
  }, [currentMonth, isMonthView, cols, weekStart, weekOpts]);

  const visibleHeaders = useMemo(() => {
    if (isMonthView) {
      return weekStartsOn === 1 ? WEEKDAY_HEADERS_MON : WEEKDAY_HEADERS_SUN;
    }
    return days.slice(0, cols).map((d) => format(d, "EEE"));
  }, [isMonthView, days, cols, weekStartsOn]);

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={cn([
          "border-r border-neutral-200 flex flex-col transition-all duration-200",
          showSettings ? "w-72" : "w-0 border-r-0",
        ])}
      >
        {showSettings && (
          <>
            <div className="px-2 pt-1 pb-1 border-b border-neutral-200 shrink-0 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="bg-neutral-200"
                onClick={() => setShowSettings(false)}
              >
                <CalendarCogIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-neutral-900">
                Calendars
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <CalendarSidebarContent />
            </div>
          </>
        )}
      </div>
      <div ref={containerRef} className="flex flex-col flex-1 min-w-0">
        <div
          className={cn([
            "flex items-center justify-between",
            "px-2 pt-1 pb-1 border-b border-neutral-200",
          ])}
        >
          <div className="flex items-center gap-2">
            {!showSettings && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <CalendarCogIcon className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold text-neutral-900">
              {isMonthView
                ? format(currentMonth, "MMMM yyyy")
                : days.length > 0
                  ? format(days[0], "MMMM yyyy")
                  : ""}
            </h2>
          </div>
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon"
              className="shadow-none"
              onClick={goToPrev}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shadow-none px-3"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shadow-none"
              onClick={goToNext}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </ButtonGroup>
        </div>

        <div
          className="grid border-b border-neutral-200"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {visibleHeaders.map((day, i) => (
            <div
              key={`${day}-${i}`}
              className={cn([
                "text-center text-xs font-medium text-neutral-500",
                "py-2",
              ])}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          className={cn([
            "flex-1 grid overflow-hidden",
            isMonthView ? "auto-rows-fr" : "grid-rows-1",
          ])}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <DayCell
              key={day.toISOString()}
              day={day}
              isCurrentMonth={
                isMonthView ? isSameMonth(day, currentMonth) : true
              }
              calendarData={calendarData}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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

function DayCell({
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
            !today && isCurrentMonth && "text-neutral-900",
            !today && !isCurrentMonth && "text-neutral-400",
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

function useCalendarColor(calendarId: string | null): string | null {
  const calendar = main.UI.useRow("calendars", calendarId ?? "", main.STORE_ID);
  if (!calendarId) return null;
  return calendar?.color ? String(calendar.color) : null;
}

function EventChip({ eventId }: { eventId: string }) {
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
        className="w-full min-h-8 bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white"
        onClick={handleOpen}
      >
        Open note
      </Button>
    </div>
  );
}

function SessionChip({ sessionId }: { sessionId: string }) {
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
        className="w-full min-h-8 bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white"
        onClick={handleOpen}
      >
        Open note
      </Button>
    </div>
  );
}

function CalendarSidebarContent() {
  const isMacos = platform() === "macos";
  const calendar = usePermission("calendar");
  const contacts = usePermission("contacts");

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <Accordion type="single" collapsible defaultValue="apple">
      {visibleProviders.map((provider) =>
        provider.disabled ? (
          <div
            key={provider.id}
            className="flex items-center gap-2 py-2 opacity-50"
          >
            {provider.icon}
            <span className="text-sm font-medium">{provider.displayName}</span>
            {provider.badge && (
              <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
                {provider.badge}
              </span>
            )}
          </div>
        ) : (
          <AccordionItem
            key={provider.id}
            value={provider.id}
            className="border-none"
          >
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                {provider.icon}
                <span className="text-sm font-medium">
                  {provider.displayName}
                </span>
                {provider.badge && (
                  <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
                    {provider.badge}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              {provider.id === "apple" && (
                <div className="flex flex-col gap-3">
                  {(calendar.status !== "authorized" ||
                    contacts.status !== "authorized") && (
                    <div className="flex flex-col gap-1">
                      {calendar.status !== "authorized" && (
                        <AccessPermissionRow
                          title="Calendar"
                          status={calendar.status}
                          isPending={calendar.isPending}
                          onOpen={calendar.open}
                          onRequest={calendar.request}
                          onReset={calendar.reset}
                        />
                      )}
                      {contacts.status !== "authorized" && (
                        <AccessPermissionRow
                          title="Contacts"
                          status={contacts.status}
                          isPending={contacts.isPending}
                          onOpen={contacts.open}
                          onRequest={contacts.request}
                          onReset={contacts.reset}
                        />
                      )}
                    </div>
                  )}
                  {calendar.status === "authorized" && (
                    <SyncProvider>
                      <AppleCalendarSelection />
                    </SyncProvider>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ),
      )}
    </Accordion>
  );
}
