import { platform } from "@tauri-apps/plugin-os";

import { useAppleCalendarSelection } from "../settings/calendar/configure/apple/calendar-selection";
import { SyncProvider } from "../settings/calendar/configure/apple/context";
import { ApplePermissions } from "../settings/calendar/configure/apple/permission";
import { CalendarSelection } from "../settings/calendar/configure/shared";
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
  const isMacos = platform() === "macos";

  return (
    <div className="flex flex-col gap-4">
      {isMacos && (
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
