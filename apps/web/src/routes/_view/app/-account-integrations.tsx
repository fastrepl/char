import { Link, useNavigate } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { useBilling } from "@/hooks/use-billing";
import { useConnections } from "@/hooks/use-connections";

const INTEGRATIONS = [
  { id: "google-calendar", name: "Google Calendar" },
] as const;

export function IntegrationsSettingsCard() {
  const navigate = useNavigate();
  const billing = useBilling();
  const { data: connections, isLoading } = useConnections();

  const getConnectionStatus = (integrationId: string) => {
    return connections?.find((c) => c.integration_id === integrationId);
  };

  return (
    <div className="border border-neutral-100 rounded-xs">
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold mb-2">Integrations</h3>
        <p className="text-sm text-neutral-600">
          Connect third-party services to enhance your experience
        </p>
      </div>

      {INTEGRATIONS.map((integration) => {
        const connection = getConnectionStatus(integration.id);
        const isConnected = !!connection;

        return (
          <div
            key={integration.id}
            className="flex items-center justify-between border-t border-neutral-100 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">{integration.name}</div>
              {!billing.isPro && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Pro
                </span>
              )}
              {isLoading ? (
                <span className="text-xs text-neutral-400">Checking...</span>
              ) : isConnected ? (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Connected
                </span>
              ) : null}
            </div>
            {!billing.isPro ? (
              <Link
                to="/app/checkout/"
                search={{ period: "monthly" }}
                className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
              >
                Upgrade to Pro
              </Link>
            ) : (
              <button
                onClick={() =>
                  navigate({
                    to: "/app/integration/",
                    search: { integration_id: integration.id },
                  })
                }
                className={cn([
                  "px-4 h-8 flex items-center text-sm rounded-full transition-all cursor-pointer",
                  isConnected
                    ? "bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%]"
                    : "bg-linear-to-t from-stone-600 to-stone-500 text-white shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                ])}
              >
                {isConnected ? "Reconnect" : "Connect"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
