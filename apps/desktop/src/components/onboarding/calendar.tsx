import { platform } from "@tauri-apps/plugin-os";

import { useAppleCalendarSelection } from "../main/body/calendar/apple/calendar-selection";
import { SyncProvider } from "../main/body/calendar/apple/context";
import { ApplePermissions } from "../main/body/calendar/apple/permission";
import { CalendarSelection } from "../main/body/calendar/calendar-selection";
import { OnboardingButton } from "./shared";

function AppleCalendarList() {
  const { groups, handleToggle, isLoading } = useAppleCalendarSelection();
  return (
    <CalendarSelection
      groups={groups}
      onToggle={handleToggle}
      isLoading={isLoading}
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
