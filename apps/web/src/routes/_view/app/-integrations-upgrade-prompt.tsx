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
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-serif tracking-tight text-stone-700">
              {display.name}
            </h1>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
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
              "w-full h-12 flex items-center justify-center text-base font-medium transition-all cursor-pointer rounded-full shadow-md",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            ])}
          >
            Upgrade to Pro
          </Link>

          {flow === "desktop" ? (
            <button
              onClick={() => {
                window.location.href = `${scheme}://integration/callback?integration_id=${integrationId}&status=upgrade_required`;
              }}
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              Back to app
            </button>
          ) : (
            <Link
              to="/app/account/"
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Back to account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
