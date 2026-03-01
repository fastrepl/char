import { Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { getIntegrationDisplay } from "./integration";

export function UpgradePrompt({
  integrationId,
  flow,
  scheme,
}: {
  integrationId: string;
  flow: string;
  scheme: string;
}) {
  const display = getIntegrationDisplay(integrationId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-white via-stone-50/20 to-white p-6">
      <div className="flex w-full max-w-md flex-col gap-8 text-center">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-serif text-3xl tracking-tight text-stone-700">
              {display.name}
            </h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Pro
            </span>
          </div>
          <p className="text-neutral-600">
            Upgrade to Pro to connect {display.name} and other integrations.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/app/checkout/"
            search={{ period: "monthly" }}
            className={cn([
              "flex h-12 w-full cursor-pointer items-center justify-center rounded-full text-base font-medium shadow-md transition-all",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white hover:scale-[102%] hover:shadow-lg active:scale-[98%]",
            ])}
          >
            Upgrade to Pro
          </Link>

          {flow === "desktop" ? (
            <button
              onClick={() => {
                window.location.href = `${scheme}://integration/callback?integration_id=${integrationId}&status=upgrade_required`;
              }}
              className="cursor-pointer text-sm text-neutral-500 transition-colors hover:text-neutral-700"
            >
              Back to app
            </button>
          ) : (
            <Link
              to="/app/account/"
              className="text-sm text-neutral-500 transition-colors hover:text-neutral-700"
            >
              Back to account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
