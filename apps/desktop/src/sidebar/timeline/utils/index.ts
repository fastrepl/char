import {
  eventMatchingKey,
  getSessionEvent,
  sessionEventMatchingKey,
} from "~/session/utils";

import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isPast,
  safeParseDate,
  startOfDay,
  startOfMonth,
  TZDate,
} from "@hypr/utils";

function toTZ(date: Date, timezone?: string): Date {
  return timezone ? new TZDate(date, timezone) : date;
}

// comes from QUERIES.timelineEvents
export type TimelineEventRow = {
  title?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  calendar_id?: string | null;
  tracking_id_event?: string | null;
  has_recurrence_rules: boolean;
  recurrence_series_id?: string | null;
};

// comes from QUERIES.timelineSessions
export type TimelineSessionRow = {
  title?: string | null;
  created_at?: string | null;
  event_json?: string | null;
  folder_id?: string | null;
};

export type TimelineEventsTable =
  | Record<string, TimelineEventRow>
  | null
  | undefined;
export type TimelineSessionsTable =
  | Record<string, TimelineSessionRow>
  | null
  | undefined;

export type EventTimelineItem = {
  type: "event";
  id: string;
  data: TimelineEventRow;
};
export type SessionTimelineItem = {
  type: "session";
  id: string;
  data: TimelineSessionRow;
};
export type TimelineItem = EventTimelineItem | SessionTimelineItem;

export type TimelinePrecision = "time" | "date";

export type TimelineBucket = {
  label: string;
  precision: TimelinePrecision;
  items: TimelineItem[];
};

export function getBucketInfo(
  date: Date,
  timezone?: string,
): {
  label: string;
  sortKey: number;
  precision: TimelinePrecision;
} {
  const now = new Date();
  const tzDate = toTZ(date, timezone);
  const tzNow = toTZ(now, timezone);
  const daysDiff = differenceInCalendarDays(tzDate, tzNow);
  const sortKey = startOfDay(tzDate).getTime();
  const absDays = Math.abs(daysDiff);

  if (daysDiff === 0) {
    return { label: "Today", sortKey, precision: "time" };
  }

  if (daysDiff === -1) {
    return { label: "Yesterday", sortKey, precision: "time" };
  }

  if (daysDiff === 1) {
    return { label: "Tomorrow", sortKey, precision: "time" };
  }

  if (daysDiff < 0) {
    if (absDays <= 6) {
      return { label: `${absDays} days ago`, sortKey, precision: "time" };
    }

    if (absDays <= 27) {
      const weeks = Math.max(1, Math.round(absDays / 7));
      const weekRangeEndDay = Math.max(7, weeks * 7 - 3);
      const weekRangeEnd = new Date(
        now.getTime() - weekRangeEndDay * 24 * 60 * 60 * 1000,
      );
      const weekSortKey = startOfDay(toTZ(weekRangeEnd, timezone)).getTime();

      return {
        label: weeks === 1 ? "a week ago" : `${weeks} weeks ago`,
        sortKey: weekSortKey,
        precision: "date",
      };
    }

    let months = Math.abs(differenceInCalendarMonths(tzDate, tzNow));
    if (months === 0) {
      months = 1;
    }
    const monthStartKey = startOfMonth(tzDate).getTime();
    const lastDayInMonthBucket = new Date(
      now.getTime() - 28 * 24 * 60 * 60 * 1000,
    );
    const lastDayKey = startOfDay(
      toTZ(lastDayInMonthBucket, timezone),
    ).getTime();
    const monthSortKey = Math.min(monthStartKey, lastDayKey);
    return {
      label: months === 1 ? "a month ago" : `${months} months ago`,
      sortKey: monthSortKey,
      precision: "date",
    };
  }

  if (absDays <= 6) {
    return { label: `in ${absDays} days`, sortKey, precision: "time" };
  }

  if (absDays <= 27) {
    const weeks = Math.max(1, Math.round(absDays / 7));
    const weekRangeStartDay = Math.max(7, weeks * 7 - 3);
    const weekRangeStart = new Date(
      now.getTime() + weekRangeStartDay * 24 * 60 * 60 * 1000,
    );
    const weekSortKey = startOfDay(toTZ(weekRangeStart, timezone)).getTime();

    return {
      label: weeks === 1 ? "next week" : `in ${weeks} weeks`,
      sortKey: weekSortKey,
      precision: "date",
    };
  }

  let months = differenceInCalendarMonths(tzDate, tzNow);
  if (months === 0) {
    months = 1;
  }
  const monthStartKey = startOfMonth(tzDate).getTime();
  const firstDayInMonthBucket = new Date(
    now.getTime() + 28 * 24 * 60 * 60 * 1000,
  );
  const firstDayKey = startOfDay(
    toTZ(firstDayInMonthBucket, timezone),
  ).getTime();
  const monthSortKey = Math.max(monthStartKey, firstDayKey);
  return {
    label: months === 1 ? "next month" : `in ${months} months`,
    sortKey: monthSortKey,
    precision: "date",
  };
}

export function calculateIndicatorIndex(
  entries: Array<{ timestamp: Date | null }>,
  current: Date,
): number {
  const index = entries.findIndex(({ timestamp }) => {
    if (!timestamp) {
      return true;
    }

    return timestamp.getTime() < current.getTime();
  });

  if (index === -1) {
    return entries.length;
  }

  return index;
}

export function getItemTimestamp(item: TimelineItem): Date | null {
  if (item.type === "event") {
    return safeParseDate(item.data.started_at);
  }
  return safeParseDate(
    getSessionEvent(item.data)?.started_at ?? item.data.created_at,
  );
}

function getEventKey(row: TimelineEventRow, timezone?: string): string {
  return eventMatchingKey(row, timezone);
}

function getSessionKey(row: TimelineSessionRow, timezone?: string): string {
  const event = getSessionEvent(row);
  if (!event) return "";
  return sessionEventMatchingKey(event, timezone);
}

export function buildTimelineBuckets({
  timelineEventsTable,
  timelineSessionsTable,
  timezone,
}: {
  timelineEventsTable: TimelineEventsTable;
  timelineSessionsTable: TimelineSessionsTable;
  timezone?: string;
}): TimelineBucket[] {
  const items: TimelineItem[] = [];
  const seenEventKeys = new Set<string>();

  if (timelineSessionsTable) {
    Object.entries(timelineSessionsTable).forEach(([sessionId, row]) => {
      const sessionEvent = getSessionEvent(row);
      const startTime = safeParseDate(
        sessionEvent?.started_at ?? row.created_at,
      );

      if (!startTime) {
        return;
      }

      items.push({
        type: "session",
        id: sessionId,
        data: row,
      });
      const key = getSessionKey(row, timezone);
      if (key) {
        seenEventKeys.add(key);
      }
    });
  }

  if (timelineEventsTable) {
    Object.entries(timelineEventsTable).forEach(([eventId, row]) => {
      const key = getEventKey(row, timezone);
      if (key && seenEventKeys.has(key)) {
        return;
      }
      const eventStartTime = safeParseDate(row.started_at);
      const eventEndTime = safeParseDate(row.ended_at);
      const timeToCheck = eventEndTime || eventStartTime;
      if (!timeToCheck) {
        return;
      }

      if (!isPast(timeToCheck)) {
        items.push({
          type: "event",
          id: eventId,
          data: row,
        });
      }
    });
  }

  items.sort((a, b) => {
    const dateA = getItemTimestamp(a);
    const dateB = getItemTimestamp(b);
    const timeAValue = dateA?.getTime() ?? 0;
    const timeBValue = dateB?.getTime() ?? 0;
    if (timeBValue == timeAValue) {
      return (a.data.title ?? "Untitled") > (b.data.title ?? "Untitled")
        ? 1
        : (a.data.title ?? "Untitled") < (b.data.title ?? "Untitled")
          ? -1
          : 0;
    }
    return timeBValue - timeAValue;
  });

  const bucketMap = new Map<
    string,
    { sortKey: number; precision: TimelinePrecision; items: TimelineItem[] }
  >();

  items.forEach((item) => {
    const bucket = getBucketInfo(
      getItemTimestamp(item) ?? new Date(0),
      timezone,
    );

    if (!bucketMap.has(bucket.label)) {
      bucketMap.set(bucket.label, {
        sortKey: bucket.sortKey,
        precision: bucket.precision,
        items: [],
      });
    }
    bucketMap.get(bucket.label)!.items.push(item);
  });

  return Array.from(bucketMap.entries())
    .sort((a, b) => b[1].sortKey - a[1].sortKey)
    .map(
      ([label, value]) =>
        ({
          label,
          items: value.items,
          precision: value.precision,
        }) satisfies TimelineBucket,
    );
}
