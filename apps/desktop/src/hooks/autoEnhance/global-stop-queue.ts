export type GlobalAutoEnhanceRunResult = "handled" | "retryable";

export function processPendingStopSessions(params: {
  pendingStops: Set<string>;
  handledStops: Set<string>;
  runForSession: (sessionId: string) => GlobalAutoEnhanceRunResult;
}) {
  const { pendingStops, handledStops, runForSession } = params;
  const sessionIds = Array.from(pendingStops);
  for (const sessionId of sessionIds) {
    const result = runForSession(sessionId);
    if (result === "handled") {
      pendingStops.delete(sessionId);
      handledStops.add(sessionId);
    }
  }
}

export function clearTrackedStopSession(params: {
  sessionId: string;
  pendingStops: Set<string>;
  handledStops: Set<string>;
}) {
  const { sessionId, pendingStops, handledStops } = params;
  pendingStops.delete(sessionId);
  handledStops.delete(sessionId);
}
