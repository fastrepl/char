import { describe, expect, it } from "vitest";

import type { Tab } from "../store/zustand/tabs/schema";
import {
  clearTrackedStopSession,
  processPendingStopSessions,
} from "./autoEnhance/global-stop-queue";
import { getStoppedSessionToAutoEnhance } from "./autoEnhance/global-trigger";

function createSessionTab(id: string, active = false): Tab {
  return {
    type: "sessions",
    id,
    pinned: false,
    active,
    slotId: `slot-${id}`,
    state: {
      view: { type: "raw" },
      autoStart: null,
    },
  };
}

describe("getStoppedSessionToAutoEnhance", () => {
  it("returns stopped session when it is no longer visible", () => {
    const result = getStoppedSessionToAutoEnhance({
      previousStatus: "active",
      currentStatus: "inactive",
      previousSessionId: "session-1",
      currentTab: createSessionTab("session-2", true),
      handledStops: new Set<string>(),
    });

    expect(result).toBe("session-1");
  });

  it("skips when the stopped session tab is currently visible", () => {
    const result = getStoppedSessionToAutoEnhance({
      previousStatus: "active",
      currentStatus: "inactive",
      previousSessionId: "session-1",
      currentTab: createSessionTab("session-1", true),
      handledStops: new Set<string>(),
    });

    expect(result).toBeNull();
  });

  it("skips when the stop event was already handled", () => {
    const result = getStoppedSessionToAutoEnhance({
      previousStatus: "finalizing",
      currentStatus: "inactive",
      previousSessionId: "session-1",
      currentTab: createSessionTab("session-2", true),
      handledStops: new Set<string>(["session-1"]),
    });

    expect(result).toBeNull();
  });

  it("skips when there is no active/finalizing to inactive transition", () => {
    const result = getStoppedSessionToAutoEnhance({
      previousStatus: "inactive",
      currentStatus: "inactive",
      previousSessionId: "session-1",
      currentTab: createSessionTab("session-2", true),
      handledStops: new Set<string>(),
    });

    expect(result).toBeNull();
  });
});

describe("processPendingStopSessions", () => {
  it("keeps stop pending when run remains retryable", () => {
    const pendingStops = new Set<string>(["session-1"]);
    const handledStops = new Set<string>();

    processPendingStopSessions({
      pendingStops,
      handledStops,
      runForSession: () => "retryable",
    });

    expect(pendingStops.has("session-1")).toBe(true);
    expect(handledStops.size).toBe(0);
  });

  it("moves stop to handled only after a handled run result", () => {
    const pendingStops = new Set<string>(["session-1", "session-2"]);
    const handledStops = new Set<string>();

    processPendingStopSessions({
      pendingStops,
      handledStops,
      runForSession: (sessionId) =>
        sessionId === "session-1" ? "handled" : "retryable",
    });

    expect(handledStops.has("session-1")).toBe(true);
    expect(pendingStops.has("session-1")).toBe(false);
    expect(pendingStops.has("session-2")).toBe(true);
  });
});

describe("clearTrackedStopSession", () => {
  it("clears pending and handled markers for an active session", () => {
    const pendingStops = new Set<string>(["session-1"]);
    const handledStops = new Set<string>(["session-1"]);

    clearTrackedStopSession({
      sessionId: "session-1",
      pendingStops,
      handledStops,
    });

    expect(pendingStops.has("session-1")).toBe(false);
    expect(handledStops.has("session-1")).toBe(false);
  });

  it("allows a later stop transition after active cleanup", () => {
    const pendingStops = new Set<string>(["session-1"]);
    const handledStops = new Set<string>(["session-1"]);

    clearTrackedStopSession({
      sessionId: "session-1",
      pendingStops,
      handledStops,
    });

    const result = getStoppedSessionToAutoEnhance({
      previousStatus: "active",
      currentStatus: "inactive",
      previousSessionId: "session-1",
      currentTab: createSessionTab("session-2", true),
      handledStops,
    });

    expect(result).toBe("session-1");
  });
});
