import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { signOutFn, updateUserEmail } from "@/functions/auth";
import {
  canStartTrial,
  createPortalSession,
  createTrialCheckoutSession,
  syncAfterSuccess,
} from "@/functions/billing";

const VALID_SCHEMES = [
  "hyprnote",
  "hyprnote-nightly",
  "hyprnote-staging",
  "hypr",
] as const;

const validateSearch = z
  .object({
    success: z.coerce.boolean(),
    trial: z.enum(["started"]),
    scheme: z.enum(VALID_SCHEMES),
  })
  .partial();

export const Route = createFileRoute("/_view/app/account")({
  validateSearch,
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

function Component() {
  const { user } = Route.useLoaderData();
  const search = Route.useSearch();

  useEffect(() => {
    if ((search.success || search.trial === "started") && search.scheme) {
      window.location.href = `${search.scheme}://billing/refresh`;
    }
  }, [search.success, search.trial, search.scheme]);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <h1 className="font-serif text-3xl font-medium text-center">
            Welcome back {user?.email?.split("@")[0] || "Guest"}
          </h1>
        </div>

        <div className="mt-8 flex flex-col gap-6 px-4 pb-20 max-w-4xl mx-auto">
          <ProfileInfoSection email={user?.email} />

          <AccountSettingsCard />

          {/* <IntegrationsSettingsCard /> */}

          <DeleteAccountSection />

          <SignOutSection />
        </div>
      </div>
    </div>
  );
}

function ProfileInfoSection({ email }: { email?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await updateUserEmail({ data: { email } });
      if ("error" in res && res.error) {
        throw new Error(res.error);
      }
      return res;
    },
    onSuccess: (data) => {
      if ("message" in data && data.message) {
        setSuccessMessage(data.message);
      }
      setIsEditing(false);
      setNewEmail("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail && newEmail !== email) {
      updateEmailMutation.mutate(newEmail);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewEmail("");
    updateEmailMutation.reset();
  };

  return (
    <section>
      <h2 className="text-lg font-medium mb-4 font-serif">Profile info</h2>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-sm text-neutral-500 mb-1">Email</div>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={email || "Enter new email"}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              {updateEmailMutation.isError && (
                <p className="text-sm text-red-600">
                  {updateEmailMutation.error?.message ||
                    "Failed to update email"}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    updateEmailMutation.isPending ||
                    !newEmail ||
                    newEmail === email
                  }
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {updateEmailMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updateEmailMutation.isPending}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-base">{email || "Not available"}</div>
              <button
                onClick={() => {
                  setIsEditing(true);
                  setSuccessMessage(null);
                }}
                className="px-3 h-7 flex items-center text-xs bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
              >
                Change
              </button>
            </div>
          )}
        </div>
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AccountSettingsCard() {
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
    mutationFn: async () => {
      const { url } = await createTrialCheckoutSession({ data: {} });
      if (url) {
        window.location.href = url;
      }
    },
  });

  const currentPlan = (() => {
    if (!billingQuery.data || billingQuery.data.status === "none") {
      return "free";
    }
    const status = billingQuery.data.status;
    if (status === "trialing") return "trial";
    if (status === "active") return "pro";
    return "free";
  })();

  const renderPlanButton = () => {
    if (billingQuery.isLoading || canTrialQuery.isLoading) {
      return (
        <div className="px-4 h-8 flex items-center text-sm text-neutral-400">
          Loading...
        </div>
      );
    }

    if (currentPlan === "free") {
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

  const getPlanDisplay = () => {
    if (billingQuery.isLoading) return "...";
    if (currentPlan === "trial") return "Trial";
    if (currentPlan === "pro") return "Pro";
    return "Free";
  };

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
          Current plan: <span className="font-medium">{getPlanDisplay()}</span>
        </div>
        {renderPlanButton()}
      </div>
    </div>
  );
}

function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <section>
      <h2 className="text-lg font-medium mb-2 font-serif">Delete Account</h2>
      <p className="text-sm text-neutral-500 mb-4">
        Char is a local-first app — your notes, transcripts, and meeting data
        are stored locally on your device and will not be affected by account
        deletion. Deleting your account only removes your cloud-stored data.
      </p>
      {showConfirm ? (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <p className="text-sm text-red-800 mb-3">
            To request account deletion, please email us at{" "}
            <a
              href="mailto:privacy@char.com?subject=Account%20Deletion%20Request"
              className="underline font-medium"
            >
              privacy@char.com
            </a>
            . We will delete your cloud data within 30 days.
          </p>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="cursor-pointer px-4 h-8 flex items-center text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full transition-all"
        >
          Request Account Deletion
        </button>
      )}
    </section>
  );
}

function SignOutSection() {
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: async () => {
      const res = await signOutFn();
      if (res.success) {
        return true;
      }

      throw new Error(res.message);
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (error) => {
      console.error(error);
      navigate({ to: "/" });
    },
  });

  return (
    <section className="pt-6">
      <button
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="cursor-pointer px-4 h-8 flex items-center text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full transition-all disabled:opacity-50 disabled:hover:border-red-200"
      >
        {signOut.isPending ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}
