import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
  canStartTrial,
  createPortalSession,
  startTrial,
} from "@/functions/billing";
import { useBilling } from "@/hooks/use-billing";

export function AccountSettingsCard() {
  const billing = useBilling();

  const canTrialQuery = useQuery({
    queryKey: ["canStartTrial"],
    queryFn: () => canStartTrial(),
  });

  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: () => startTrial(),
    onSuccess: () => {
      billing.refreshBilling();
      canTrialQuery.refetch();
    },
  });

  const renderPlanButton = () => {
    if (!billing.isReady || canTrialQuery.isLoading) {
      return (
        <div className="px-4 h-8 flex items-center text-sm text-neutral-400">
          Loading...
        </div>
      );
    }

    if (billing.plan === "free") {
      if (canTrialQuery.data) {
        return (
          <button
            onClick={() => startTrialMutation.mutate()}
            disabled={startTrialMutation.isPending}
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {startTrialMutation.isPending ? "Loading..." : "Start Free Trial"}
          </button>
        );
      }

      return (
        <Link
          to="/app/checkout/"
          search={{ period: "monthly" }}
          className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
        >
          Upgrade to Pro
        </Link>
      );
    }

    return (
      <button
        onClick={() => manageBillingMutation.mutate()}
        disabled={manageBillingMutation.isPending}
        className="cursor-pointer px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        {manageBillingMutation.isPending ? "Loading..." : "Manage Billing"}
      </button>
    );
  };

  const planDisplay = !billing.isReady
    ? "..."
    : billing.plan === "trial"
      ? "Trial"
      : billing.plan === "pro"
        ? "Pro"
        : "Free";

  return (
    <div className="border border-neutral-100 rounded-xs">
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold mb-2">
          Account Settings
        </h3>
        <p className="text-sm text-neutral-600">
          Manage your account preferences and billing settings
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 p-4">
        <div className="text-sm">
          Current plan: <span className="font-medium">{planDisplay}</span>
        </div>
        {renderPlanButton()}
      </div>
    </div>
  );
}
