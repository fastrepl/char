import { useQueryClient } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as sfxCommands } from "@hypr/plugin-sfx";

import { usePermissions } from "../../../../hooks/usePermissions";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { LoginSection } from "../../../onboarding/account";
import { CalendarSection } from "../../../onboarding/calendar";
import {
  getInitialStep,
  getNextStep,
  getPrevStep,
  getStepStatus,
} from "../../../onboarding/config";
import { FinalSection, finishOnboarding } from "../../../onboarding/final";
import { FolderLocationSection } from "../../../onboarding/folder-location";
import { PermissionsSection } from "../../../onboarding/permissions";
import { OnboardingSection } from "../../../onboarding/shared";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemOnboarding: TabItem<
  Extract<Tab, { type: "onboarding" }>
> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<span className="text-sm">👋</span>}
      title="Welcome"
      selected={tab.active}
      allowPin={false}
      allowClose={false}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentOnboarding({
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "onboarding" }>;
}) {
  const queryClient = useQueryClient();
  const close = useTabs((state) => state.close);
  const currentTab = useTabs((state) => state.currentTab);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStep, setCurrentStep] = useState(getInitialStep);

  const { micPermissionStatus, systemAudioPermissionStatus } = usePermissions();

  const allPermissionsGranted =
    micPermissionStatus.data === "authorized" &&
    systemAudioPermissionStatus.data === "authorized";

  useEffect(() => {
    if (currentStep === "permissions" && allPermissionsGranted) {
      setCurrentStep("login");
    }
  }, [currentStep, allPermissionsGranted]);

  const goNext = useCallback(() => {
    const next = getNextStep(currentStep);
    if (next) setCurrentStep(next);
  }, [currentStep]);

  const goBack = useCallback(() => {
    const prev = getPrevStep(currentStep);
    if (prev) setCurrentStep(prev);
  }, [currentStep]);

  useEffect(() => {
    void analyticsCommands.event({
      event: "onboarding_step_viewed",
      step: currentStep,
      platform: platform(),
    });
  }, [currentStep]);

  useEffect(() => {
    sfxCommands
      .play("BGM")
      .then(() => sfxCommands.setVolume("BGM", 0.2))
      .catch(console.error);
    return () => {
      sfxCommands.stop("BGM").catch(console.error);
    };
  }, []);

  useEffect(() => {
    sfxCommands.setVolume("BGM", isMuted ? 0 : 0.2).catch(console.error);
  }, [isMuted]);

  const handleFinish = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["onboarding-needed"] });
    if (currentTab) {
      close(currentTab);
    }
  }, [close, currentTab, queryClient]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const el = scrollRef.current?.querySelector(
        `[data-step="${currentStep}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [currentStep]);

  return (
    <StandardTabWrapper>
      <div className="relative flex h-full flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 pt-4 pb-3">
          <h1 className="text-2xl font-semibold font-serif text-neutral-900">
            Welcome to Char
          </h1>
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeXIcon size={16} className="text-neutral-600" />
            ) : (
              <Volume2Icon size={16} className="text-neutral-600" />
            )}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex flex-col px-6 pb-16 gap-3">
            <OnboardingSection
              stepId="permissions"
              title="Permissions"
              completedTitle="Permissions granted"
              description="Required for best experience"
              status={getStepStatus("permissions", currentStep)}
              onBack={goBack}
              onNext={goNext}
            >
              <PermissionsSection />
            </OnboardingSection>

            <OnboardingSection
              stepId="login"
              title="Account"
              description="Sign in to unlock Pro features"
              completedTitle="Signed up"
              status={getStepStatus("login", currentStep)}
              onBack={goBack}
              onNext={goNext}
            >
              <LoginSection onContinue={goNext} />
            </OnboardingSection>

            <OnboardingSection
              stepId="calendar"
              title="Calendar"
              description="Select calendars to sync"
              completedTitle="Calendar connected"
              status={getStepStatus("calendar", currentStep)}
              onBack={goBack}
              onNext={goNext}
            >
              <CalendarSection onContinue={goNext} />
            </OnboardingSection>

            <OnboardingSection
              stepId="folder-location"
              title="Storage"
              description="Where your notes and recordings are stored"
              completedTitle="Storage configured"
              status={getStepStatus("folder-location", currentStep)}
              onBack={goBack}
              onNext={goNext}
            >
              <FolderLocationSection onContinue={goNext} />
            </OnboardingSection>

            <OnboardingSection
              stepId="final"
              title="Ready to go"
              status={getStepStatus("final", currentStep)}
              onBack={goBack}
              onNext={() => void finishOnboarding(handleFinish)}
            >
              <FinalSection onContinue={handleFinish} />
            </OnboardingSection>
          </div>
        </div>
      </div>
    </StandardTabWrapper>
  );
}
