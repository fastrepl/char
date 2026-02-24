import type { Tab } from "../../store/zustand/tabs/schema";

export type LiveStatus = "inactive" | "active" | "finalizing";

export function getStoppedSessionToAutoEnhance(params: {
  previousStatus: LiveStatus;
  currentStatus: LiveStatus;
  previousSessionId: string | null;
  currentTab: Tab | null;
  handledStops: Set<string>;
}): string | null {
  const {
    previousStatus,
    currentStatus,
    previousSessionId,
    currentTab,
    handledStops,
  } = params;

  const justStopped =
    (previousStatus === "active" || previousStatus === "finalizing") &&
    currentStatus === "inactive";
  if (!justStopped || !previousSessionId) {
    return null;
  }

  const isSessionTabVisible =
    currentTab?.type === "sessions" && currentTab.id === previousSessionId;
  if (isSessionTabVisible || handledStops.has(previousSessionId)) {
    return null;
  }

  return previousSessionId;
}
