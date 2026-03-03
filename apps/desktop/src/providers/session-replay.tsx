import posthog from "posthog-js";
import { useEffect } from "react";

import { useConfigValue } from "~/shared/config";
import { useTabs } from "~/store/zustand/tabs";

const RECORDED_TAB_TYPES = new Set(["settings", "ai", "onboarding"]);

export function SessionReplay() {
  const telemetryConsent = useConfigValue("telemetry_consent");
  const tabType = useTabs((state) => state.currentTab?.type);

  const shouldRecord =
    telemetryConsent && !!tabType && RECORDED_TAB_TYPES.has(tabType);

  useEffect(() => {
    if (shouldRecord) {
      posthog.startSessionRecording();
      return () => posthog.stopSessionRecording();
    } else {
      posthog.stopSessionRecording();
    }
  }, [shouldRecord]);

  return null;
}
