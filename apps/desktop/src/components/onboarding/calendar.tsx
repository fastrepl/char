import { useState } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { cn } from "@hypr/utils";

import { useAuth } from "../../auth";
import { buildWebAppUrl } from "../../utils";
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

function GoogleCalendarConnect() {
  const auth = useAuth();

  const handleConnect = async () => {
    const url = await buildWebAppUrl("/app/integration");
    await openerCommands.openUrl(url, null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-600">
        Connect your Google Calendar to sync your meetings.
      </p>
      <button
        onClick={handleConnect}
        disabled={!auth.session}
        className={cn([
          "w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
          "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
          !auth.session && "opacity-50 cursor-not-allowed",
        ])}
      >
        Connect Google Calendar
      </button>
    </div>
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

      {provider === "google" && <GoogleCalendarConnect />}

      <OnboardingButton onClick={onContinue}>Continue</OnboardingButton>
    </div>
  );
}
