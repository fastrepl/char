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
      <div className="mx-auto min-h-[calc(100vh-200px)] max-w-6xl border-x border-neutral-100">
        <div className="flex items-center justify-center border-b border-neutral-100 bg-linear-to-b from-stone-50/30 to-stone-100/30 py-20">
          <h1 className="text-center font-serif text-3xl font-medium">
            Welcome back {user?.email?.split("@")[0] || "Guest"}
          </h1>
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-col gap-6 px-4 pb-20">
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
