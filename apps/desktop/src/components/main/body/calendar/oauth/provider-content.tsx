import { commands as openerCommands } from "@hypr/plugin-opener2";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../../auth";
import { useConnections } from "../../../../../hooks/useConnections";
import { buildWebAppUrl } from "../../../../../utils";
import type { CalendarProvider } from "../shared";

export function OAuthProviderContent({ config }: { config: CalendarProvider }) {
  const auth = useAuth();
  const { data: connections } = useConnections();
  const connection = connections?.find(
    (c) => c.integration_id === config.nangoIntegrationId,
  );

  const handleConnect = async () => {
    if (!config.nangoIntegrationId) return;
    const url = await buildWebAppUrl("/app/integration", {
      integration_id: config.nangoIntegrationId,
    });
    await openerCommands.openUrl(url, null);
  };

  return (
    <div className="flex flex-col gap-3">
      {connection && (
        <span className="text-xs text-green-600 font-light border border-green-300 rounded-full px-2 w-fit">
          Connected
        </span>
      )}

      <button
        onClick={handleConnect}
        disabled={!auth.session}
        className={cn([
          "w-full h-9 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
          connection
            ? "bg-neutral-200 text-neutral-600 hover:bg-neutral-300 active:scale-[98%]"
            : "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
          !auth.session && "opacity-50 cursor-not-allowed",
        ])}
      >
        {connection ? "Reconnect" : "Connect"} {config.displayName} Calendar
      </button>
    </div>
  );
}
