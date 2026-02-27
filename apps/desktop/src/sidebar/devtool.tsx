import { useCallback, useEffect, useState } from "react";
import { useStores } from "tinybase/ui-react";
import { type SeedDefinition, seeds } from "~/shared/devtool/seed/index";
import {
  type Store as MainStore,
  STORE_ID as STORE_ID_PERSISTED,
} from "~/store/tinybase/store/main";
import { useTabs } from "~/store/zustand/tabs";

import {
  type AppleCalendar,
  commands as appleCalendarCommands,
} from "@hypr/plugin-apple-calendar";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";

import { getLatestVersion } from "./changelog";

declare global {
  interface Window {
    __dev?: {
      seed: (id?: string) => void;
      seeds: Array<{ id: string; label: string }>;
    };
  }
}

export function DevtoolView() {
  const stores = useStores();
  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as
    | MainStore
    | undefined;
  const [fixtureKey, setFixtureKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!persistedStore) {
      return;
    }

    const api = {
      seed: (id?: string) => {
        const target = id ? seeds.find((item) => item.id === id) : seeds[0];
        if (target) {
          target.run(persistedStore);
        }
      },
      seeds: seeds.map(({ id, label }) => ({ id, label })),
    };
    window.__dev = api;
    return () => {
      if (window.__dev === api) {
        delete window.__dev;
      }
    };
  }, [persistedStore]);

  const handleSeed = useCallback(
    async (seed: SeedDefinition) => {
      if (!persistedStore) {
        return;
      }

      let fixtureCalendars: AppleCalendar[] | undefined;

      if (seed.calendarFixtureBase) {
        try {
          if ("resetFixture" in appleCalendarCommands) {
            await (appleCalendarCommands as any).resetFixture();
          }
          const result = await appleCalendarCommands.listCalendars();
          if (result.status === "ok") {
            fixtureCalendars = result.data;
          }
          setFixtureKey((k) => k + 1);
        } catch {
          // fixture feature not enabled
        }
      }

      seed.run(persistedStore, fixtureCalendars);
    },
    [persistedStore],
  );

  if (!persistedStore) {
    return null;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-1 py-2 flex flex-col gap-2">
        <NavigationCard />
        <SeedCard onSeed={handleSeed} />
        <CalendarMockCard key={fixtureKey} />
        <ErrorTestCard />
      </div>
    </div>
  );
}

function DevtoolCard({
  title,
  children,
  maxHeight,
}: {
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}) {
  return (
    <div
      className={cn([
        "rounded-lg border border-neutral-200 bg-white",
        "shadow-xs",
        "overflow-hidden",
        "shrink-0",
      ])}
    >
      <div className="px-2 py-1.5 border-b border-neutral-100 bg-neutral-50">
        <h2 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div
        className="p-2 overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

interface FixtureInfo {
  current_step: number;
  max_steps: number;
  step_name: string;
}

function CalendarMockCard() {
  const [fixtureInfo, setFixtureInfo] = useState<FixtureInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFixtureInfo = async () => {
      try {
        if ("getFixtureInfo" in appleCalendarCommands) {
          const info = await (appleCalendarCommands as any).getFixtureInfo();
          setFixtureInfo(info);
        }
      } catch {
        // fixture feature not enabled
      }
    };
    loadFixtureInfo();
  }, []);

  const handleAdvance = useCallback(async () => {
    setIsLoading(true);
    try {
      if ("advanceFixture" in appleCalendarCommands) {
        const info = await (appleCalendarCommands as any).advanceFixture();
        setFixtureInfo(info);
      }
    } catch {
      // fixture feature not enabled
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (fixtureInfo === null) {
    return null;
  }

  const isAtEnd = fixtureInfo.current_step >= fixtureInfo.max_steps - 1;

  return (
    <DevtoolCard title="Calendar Mock">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-neutral-500">
            Step {fixtureInfo.current_step + 1} of {fixtureInfo.max_steps}
          </span>
          <span className="text-xs font-medium text-neutral-700">
            {fixtureInfo.step_name}
          </span>
        </div>
        <button
          type="button"
          onClick={handleAdvance}
          disabled={isLoading || isAtEnd}
          className={cn([
            "w-full px-2 py-1.5 rounded-md",
            "text-xs font-medium",
            "border transition-colors",
            isAtEnd
              ? ["border-neutral-100 text-neutral-300", "cursor-default"]
              : [
                  "border-blue-200 bg-blue-50 text-blue-700",
                  "hover:bg-blue-100 hover:border-blue-300",
                  "cursor-pointer",
                ],
            isLoading && "opacity-50 cursor-wait",
          ])}
        >
          Advance
        </button>
      </div>
    </DevtoolCard>
  );
}

function SeedCard({ onSeed }: { onSeed: (seed: SeedDefinition) => void }) {
  return (
    <DevtoolCard title="Seeds" maxHeight="200px">
      <div className="flex flex-col gap-1.5">
        {seeds.map((seed) => (
          <button
            key={seed.id}
            type="button"
            onClick={() => onSeed(seed)}
            className={cn([
              "w-full px-2 py-1.5 rounded-md",
              "text-xs font-medium text-left",
              "border border-neutral-200 text-neutral-700",
              "cursor-pointer transition-colors",
              "hover:bg-neutral-50 hover:border-neutral-300",
            ])}
          >
            {seed.label}
          </button>
        ))}
      </div>
    </DevtoolCard>
  );
}

function NavigationCard() {
  const openNew = useTabs((s) => s.openNew);

  const handleShowMain = useCallback(() => {
    void windowsCommands.windowShow({ type: "main" });
  }, []);

  const handleShowOnboarding = useCallback(() => {
    openNew({ type: "onboarding" });
  }, [openNew]);

  const handleShowControl = useCallback(() => {
    void windowsCommands.windowShow({ type: "control" });
  }, []);

  const handleShowChangelog = useCallback(() => {
    const latestVersion = getLatestVersion();
    if (latestVersion) {
      openNew({
        type: "changelog",
        state: { current: latestVersion, previous: null },
      });
    }
  }, [openNew]);

  return (
    <DevtoolCard title="Navigation">
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleShowOnboarding}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-neutral-200 text-neutral-700",
            "cursor-pointer transition-colors",
            "hover:bg-neutral-50 hover:border-neutral-300",
          ])}
        >
          Onboarding
        </button>
        <button
          type="button"
          onClick={handleShowMain}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-neutral-200 text-neutral-700",
            "cursor-pointer transition-colors",
            "hover:bg-neutral-50 hover:border-neutral-300",
          ])}
        >
          Main
        </button>
        <button
          type="button"
          onClick={handleShowControl}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-neutral-200 text-neutral-700",
            "cursor-pointer transition-colors",
            "hover:bg-neutral-50 hover:border-neutral-300",
          ])}
        >
          Control
        </button>
        <button
          type="button"
          onClick={handleShowChangelog}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-neutral-200 text-neutral-700",
            "cursor-pointer transition-colors",
            "hover:bg-neutral-50 hover:border-neutral-300",
          ])}
        >
          Changelog
        </button>
      </div>
    </DevtoolCard>
  );
}

function ErrorTestCard() {
  const [shouldThrow, setShouldThrow] = useState(false);

  const handleTriggerError = useCallback(() => {
    setShouldThrow(true);
  }, []);

  if (shouldThrow) {
    throw new Error("Test error triggered from devtools");
  }

  return (
    <DevtoolCard title="Error Testing">
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleTriggerError}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-red-200 text-red-700 bg-red-50",
            "cursor-pointer transition-colors",
            "hover:bg-red-100 hover:border-red-300",
          ])}
        >
          Trigger Error
        </button>
      </div>
    </DevtoolCard>
  );
}
