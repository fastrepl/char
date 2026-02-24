import { describe, expect, it } from "vitest";

import type { Tab } from "../store/zustand/tabs/schema";
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
