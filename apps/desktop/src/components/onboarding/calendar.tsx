import { platform } from "@tauri-apps/plugin-os";
import { CalendarIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";

import { usePermission } from "../../hooks/usePermissions";
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

function RequestCalendarAccess({
  onRequest,
  isPending,
}: {
  onRequest: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 border rounded-lg">
      <CalendarIcon className="size-6 text-neutral-300 mb-2" />
      <Button
        variant="outline"
        size="sm"
        onClick={onRequest}
        disabled={isPending}
      >
        Request Access to Calendar
      </Button>
    </div>
  );
}

export function CalendarSection({ onContinue }: { onContinue: () => void }) {
  const isMacos = platform() === "macos";
  const calendar = usePermission("calendar");
  const isAuthorized = calendar.status === "authorized";

  return (
    <div className="flex flex-col gap-4">
      {isMacos && (
        <div className="flex flex-col gap-4">
          <ApplePermissions />

          {isAuthorized ? (
            <SyncProvider>
              <AppleCalendarList />
            </SyncProvider>
          ) : (
            <RequestCalendarAccess
              onRequest={calendar.request}
              isPending={calendar.isPending}
            />
          )}
        </div>
      )}

      <OnboardingButton onClick={onContinue}>Continue</OnboardingButton>
    </div>
  );
}
