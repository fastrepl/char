import * as Sentry from "@sentry/react";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { startTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAuth } from "../../auth";
import { useBillingAccess } from "../../billing";
import { env } from "../../env";
import * as settings from "../../store/tinybase/store/settings";
import { configureProSettings } from "../../utils";
import { Divider, OnboardingButton } from "./shared";

type TrialPhase =
  | { step: "checking" }
  | { step: "starting" }
  | {
      step: "done";
      result:
        | "started"
        | "not-eligible"
        | "failed"
        | "already-pro"
        | "already-trialing";
    };

function StepRow({
  status,
  label,
}: {
  status: "done" | "active" | "failed";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "done" && (
        <CheckCircle2Icon className="size-4 text-emerald-600" />
      )}
      {status === "active" && (
        <Loader2Icon className="size-4 text-neutral-400 animate-spin" />
      )}
      {status === "failed" && <XCircleIcon className="size-4 text-red-400" />}
      <span
        className={status === "failed" ? "text-red-500" : "text-neutral-500"}
      >
        {label}
      </span>
    </div>
  );
}

export function LoginSection({ onContinue }: { onContinue: () => void }) {
  const auth = useAuth();
  const billing = useBillingAccess();
  const store = settings.UI.useStore(settings.STORE_ID);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [trialPhase, setTrialPhase] = useState<TrialPhase | null>(null);
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current || !auth?.session) return;

    setTrialPhase((prev) => prev ?? { step: "checking" });

    const billingReady =
      billing.isPro || billing.isTrialing || !billing.canStartTrial.isPending;
    if (!billingReady) return;

    hasHandledRef.current = true;

    if (billing.isPro && !billing.isTrialing) {
      if (store) configureProSettings(store);
      setTrialPhase({ step: "done", result: "already-pro" });
      setTimeout(onContinue, 1500);
      return;
    }

    if (billing.isTrialing) {
      if (store) configureProSettings(store);
      setTrialPhase({ step: "done", result: "already-trialing" });
      setTimeout(onContinue, 1500);
      return;
    }

    if (!billing.canStartTrial.data) {
      setTrialPhase({ step: "done", result: "not-eligible" });
      onContinue();
      return;
    }

    const handle = async () => {
      const headers = auth.getHeaders();
      if (!headers) {
        onContinue();
        return;
      }

      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      setTrialPhase({ step: "starting" });

      try {
        const { data: startData, error } = await startTrial({
          client,
          query: { interval: "monthly" },
        });

        if (error || !startData?.started) {
          Sentry.captureMessage("Trial start failed", {
            level: "warning",
            extra: { error },
          });
          setTrialPhase({ step: "done", result: "failed" });
          await auth.refreshSession();
          await new Promise((r) => setTimeout(r, 1500));
          onContinue();
          return;
        }

        if (store) configureProSettings(store);

        void analyticsCommands.event({ event: "trial_started", plan: "pro" });
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        void analyticsCommands.setProperties({
          set: { plan: "pro", trial_end_date: trialEndDate.toISOString() },
        });

        setTrialPhase({ step: "done", result: "started" });
        await auth.refreshSession();
        await new Promise((r) => setTimeout(r, 3000));
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
        setTrialPhase({ step: "done", result: "failed" });
        await new Promise((r) => setTimeout(r, 1500));
      }

      onContinue();
    };

    void handle();
  }, [auth, billing, store, onContinue]);

  if (trialPhase) {
    return (
      <div className="flex flex-col gap-1.5">
        <StepRow status="done" label="Signed in" />

        {trialPhase.step === "checking" && (
          <StepRow status="active" label="Checking trial eligibility…" />
        )}

        {trialPhase.step === "starting" && (
          <>
            <StepRow status="done" label="Eligible for free trial" />
            <StepRow status="active" label="Starting your trial…" />
          </>
        )}

        {trialPhase.step === "done" && trialPhase.result === "started" && (
          <>
            <StepRow status="done" label="Eligible for free trial" />
            <StepRow status="done" label="Trial activated — 14 days of Pro" />
          </>
        )}

        {trialPhase.step === "done" && trialPhase.result === "failed" && (
          <>
            <StepRow status="done" label="Eligible for free trial" />
            <StepRow status="failed" label="Could not start trial" />
          </>
        )}

        {trialPhase.step === "done" && trialPhase.result === "already-pro" && (
          <StepRow status="done" label="You have an active Pro plan" />
        )}

        {trialPhase.step === "done" &&
          trialPhase.result === "already-trialing" && (
            <StepRow status="done" label="You're on a Pro trial" />
          )}
      </div>
    );
  }

  if (auth?.session) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2Icon className="size-4" />
        <span>Signed in</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <OnboardingButton onClick={() => auth?.signIn()}>
        Sign in
      </OnboardingButton>

      <Divider text="or paste callback URL" />

      <div className="relative flex items-center border rounded-full overflow-hidden transition-all duration-200 border-neutral-200 focus-within:border-neutral-400">
        <input
          type="text"
          className="flex-1 px-4 py-3 text-xs font-mono outline-hidden bg-white"
          placeholder="char://...?access_token=..."
          value={callbackUrl}
          onChange={(e) => setCallbackUrl(e.target.value)}
        />
        <button
          onClick={() => auth?.handleAuthCallback(callbackUrl)}
          disabled={!callbackUrl}
          className="absolute right-0.5 px-4 py-2 text-sm bg-neutral-600 text-white rounded-full enabled:hover:scale-[1.02] enabled:active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Submit
        </button>
      </div>

      <button
        onClick={onContinue}
        className="text-sm text-neutral-400 transition-opacity duration-150 hover:opacity-70"
      >
        proceed without account
      </button>
    </div>
  );
}
