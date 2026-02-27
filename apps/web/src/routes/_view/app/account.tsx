import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { DeleteAccountSection } from "./-account-delete";
import { IntegrationsSettingsCard } from "./-account-integrations";
import { ProfileInfoSection } from "./-account-profile-info";
import { AccountSettingsCard } from "./-account-settings";
import { SignOutSection } from "./-account-sign-out";

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
    <div>
      <div className="max-w-6xl mx-auto border-x border-neutral-100 min-h-[calc(100vh-200px)]">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <h1 className="font-serif text-3xl font-medium text-center">
            Welcome back {user?.email?.split("@")[0] || "Guest"}
          </h1>
        </div>

        <div className="mt-8 flex flex-col gap-6 px-4 pb-20 max-w-4xl mx-auto">
          <ProfileInfoSection email={user?.email} />

          <AccountSettingsCard />

          <IntegrationsSettingsCard />

          <DeleteAccountSection />

          <SignOutSection />
        </div>
      </div>
    </div>
  );
}
