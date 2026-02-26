import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import {
  type CalendarGroup,
  type CalendarItem,
  CalendarSelection,
} from "~/calendar/components/calendar-selection";
import { findCalendarByTrackingId } from "~/calendar/utils";
import * as main from "~/store/tinybase/store/main";

import {
  commands as appleCalendarCommands,
  colorToCSS,
} from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useSync } from "./context";
import { SyncIndicator } from "./sync";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AppleCalendarSelection({
  calendarClassName,
}: { calendarClassName?: string } = {}) {
  const { groups, handleToggle, handleRefresh, isLoading } =
    useAppleCalendarSelection();

  return (
    <Section
      title="Calendars"
      action={
        <div className="flex items-center gap-2">
          <SyncIndicator />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="size-6"
            disabled={isLoading}
          >
            <RefreshCwIcon
              className={cn(["size-3.5", isLoading && "animate-spin"])}
            />
          </Button>
        </div>
      }
    >
      <div className="pt-0.5"></div>
      <CalendarSelection
        groups={groups}
        onToggle={handleToggle}
        className={calendarClassName}
      />
    </Section>
  );
}

export function useAppleCalendarSelection() {
  const { scheduleSync, scheduleDebouncedSync, cancelDebouncedSync } =
    useSync();

  const store = main.UI.useStore(main.STORE_ID);
  const calendars = main.UI.useTable("calendars", main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const {
    data: incomingCalendars,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["appleCalendars"],
    queryFn: async () => {
      const [result] = await Promise.all([
        appleCalendarCommands.listCalendars(),
        new Promise((resolve) => setTimeout(resolve, 150)),
      ]);

      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  useEffect(() => {
    if (!incomingCalendars || !store || !user_id) return;

    store.transaction(() => {
      for (const cal of incomingCalendars) {
        const existingRowId = findCalendarByTrackingId(store, cal.id);
        const rowId = existingRowId ?? crypto.randomUUID();
        const existing = existingRowId
          ? store.getRow("calendars", existingRowId)
          : null;

        store.setRow("calendars", rowId, {
          user_id,
          created_at: existing?.created_at || new Date().toISOString(),
          tracking_id_calendar: cal.id,
          name: cal.title,
          enabled: existing?.enabled ?? false,
          provider: "apple",
          source: cal.source.title,
          color: colorToCSS(cal.color),
        });
      }
    });
  }, [incomingCalendars, store, user_id]);

  const groups = useMemo((): CalendarGroup[] => {
    const appleCalendars = Object.entries(calendars).filter(
      ([_, cal]) => cal.provider === "apple",
    );

    const grouped = new Map<string, CalendarItem[]>();
    for (const [id, cal] of appleCalendars) {
      const source = cal.source || "Apple Calendar";
      if (!grouped.has(source)) grouped.set(source, []);
      grouped.get(source)!.push({
        id,
        title: cal.name || "Untitled",
        color: cal.color ?? "#888",
        enabled: cal.enabled ?? false,
      });
    }

    return Array.from(grouped.entries()).map(([sourceName, calendars]) => ({
      sourceName,
      calendars,
    }));
  }, [calendars]);

  const handleToggle = useCallback(
    (calendar: CalendarItem, enabled: boolean) => {
      store?.setPartialRow("calendars", calendar.id, { enabled });
      scheduleDebouncedSync();
    },
    [store, scheduleDebouncedSync],
  );

  const handleRefresh = useCallback(async () => {
    cancelDebouncedSync();
    await refetch();
    scheduleSync();
  }, [refetch, scheduleSync, cancelDebouncedSync]);

  return {
    groups,
    handleToggle,
    handleRefresh,
    isLoading: isFetching,
  };
}
