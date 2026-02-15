import { useState } from "react";

import { cn } from "@hypr/utils";

import { useAppleCalendarSelection } from "../settings/calendar/configure/apple/calendar-selection";
import { SyncProvider } from "../settings/calendar/configure/apple/context";
import { ApplePermissions } from "../settings/calendar/configure/apple/permission";
import { CalendarSelection } from "../settings/calendar/configure/shared";
import {
  type CalendarProviderId,
  PROVIDERS,
} from "../settings/calendar/shared";
import { OnboardingButton } from "./shared";

function AppleCalendarList() {
  const { groups, handleToggle } = useAppleCalendarSelection();
  return (
    <CalendarSelection
      groups={groups}
      onToggle={handleToggle}
      className="border rounded-lg"
    />
  );
}

export function CalendarSection({ onContinue }: { onContinue: () => void }) {
  const [provider, setProvider] = useState<CalendarProviderId>("apple");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            disabled={p.disabled}
            onClick={() => setProvider(p.id)}
            className={cn([
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              provider === p.id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500",
              p.disabled
                ? "cursor-not-allowed opacity-40"
                : "hover:text-neutral-700",
            ])}
          >
            {p.icon}
            <span>{p.displayName}</span>
            {p.disabled && (
              <span className="text-[10px] text-neutral-400">(soon)</span>
            )}
          </button>
        ))}
      </div>

      {provider === "apple" && (
        <div className="flex flex-col gap-4">
          <ApplePermissions />

          <SyncProvider>
            <AppleCalendarList />
          </SyncProvider>
        </div>
      )}

      <OnboardingButton onClick={onContinue}>Continue</OnboardingButton>
    </div>
  );
}
