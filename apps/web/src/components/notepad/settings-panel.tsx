import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { signOutFn } from "@/functions/auth";
import {
  canStartTrial,
  createPortalSession,
  startTrial,
  syncAfterSuccess,
} from "@/functions/billing";

export function SettingsPanel() {
  const navigate = useNavigate();

  const billingQuery = useQuery({
    queryKey: ["billing"],
    queryFn: () => syncAfterSuccess(),
  });

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
      billingQuery.refetch();
      canTrialQuery.refetch();
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      const res = await signOutFn();
      if (res.success) return true;
      throw new Error(res.message);
    },
    onSuccess: () => navigate({ to: "/" }),
    onError: () => navigate({ to: "/" }),
  });

  const currentPlan = (() => {
    if (!billingQuery.data || billingQuery.data.status === "none")
      return "free";
    const status = billingQuery.data.status;
    if (status === "trialing") return "trial";
    if (status === "active") return "pro";
    return "free";
  })();

  const getPlanDisplay = () => {
    if (billingQuery.isLoading) return "...";
    if (currentPlan === "trial") return "Trial";
    if (currentPlan === "pro") return "Pro";
    return "Free";
  };

  const renderPlanButton = () => {
    if (billingQuery.isLoading || canTrialQuery.isLoading) {
      return <span className="text-sm text-neutral-400">Loading...</span>;
    }

    if (currentPlan === "free") {
      if (canTrialQuery.data) {
        return (
          <button
            onClick={() => startTrialMutation.mutate()}
            disabled={startTrialMutation.isPending}
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
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
        className="cursor-pointer px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
      >
        {manageBillingMutation.isPending ? "Loading..." : "Manage Billing"}
      </button>
    );
  };

  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="mt-6 flex flex-col gap-6">
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
              Current plan:{" "}
              <span className="font-medium">{getPlanDisplay()}</span>
            </div>
            {renderPlanButton()}
          </div>
        </div>

        <section className="pt-2">
          <button
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            className="cursor-pointer px-4 h-8 flex items-center text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full transition-all disabled:opacity-50"
          >
            {signOut.isPending ? "Signing out..." : "Sign out"}
          </button>
        </section>
      </div>
    </div>
  );
}
