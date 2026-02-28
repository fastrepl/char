import { useCallback } from "react";
import { useAuth } from "~/auth";
import { useBillingAccess } from "~/auth/billing";
import { useConnections } from "~/auth/useConnections";
import type { CalendarProvider } from "~/calendar/components/shared";
import { buildWebAppUrl } from "~/shared/utils";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

export function OAuthProviderContent({ config }: { config: CalendarProvider }) {
  const auth = useAuth();
  const billing = useBillingAccess();
  const { data: connections, isError } = useConnections();
  const connection = connections?.find(
    (c) => c.integration_id === config.nangoIntegrationId,
  );

  const handleConnect = useCallback(
    () =>
      openIntegrationUrl(
        config.nangoIntegrationId,
        connection?.connection_id,
        "connect",
      ),
    [config.nangoIntegrationId, connection?.connection_id],
  );

  const handleDisconnect = useCallback(
    () =>
      openIntegrationUrl(
        config.nangoIntegrationId,
        connection?.connection_id,
        "disconnect",
      ),
    [config.nangoIntegrationId, connection?.connection_id],
  );

  if (connection) {
    const reconnectDisabled = !auth.session || !billing.isPro;
    const disconnectDisabled = !auth.session;

    const reconnectButton = (
      <button
        onClick={handleConnect}
        disabled={reconnectDisabled}
        className={cn([
          "text-xs text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer",
          reconnectDisabled && "opacity-50 cursor-not-allowed",
        ])}
      >
        Reconnect
      </button>
    );

    const disconnectButton = (
      <button
        onClick={handleDisconnect}
        disabled={disconnectDisabled}
        className={cn([
          "text-xs text-red-500 hover:text-red-600 transition-colors cursor-pointer",
          disconnectDisabled && "opacity-50 cursor-not-allowed",
        ])}
      >
        Disconnect
      </button>
    );

    const tooltipMessage = !auth.session
      ? "Sign in to connect your calendar"
      : !billing.isPro
        ? "Upgrade to Pro to use this integration"
        : null;

    const disconnectTooltipMessage = !auth.session
      ? "Sign in to manage your calendar connection"
      : null;

    return (
      <div className="flex items-center justify-between px-1 pt-1 pb-2">
        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Connected
        </span>

        <div className="flex items-center gap-3">
          {tooltipMessage ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{reconnectButton}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{tooltipMessage}</TooltipContent>
            </Tooltip>
          ) : (
            reconnectButton
          )}

          {disconnectTooltipMessage ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{disconnectButton}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {disconnectTooltipMessage}
              </TooltipContent>
            </Tooltip>
          ) : (
            disconnectButton
          )}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-1 pt-1 pb-2">
        <span className="text-xs text-red-600">
          Failed to load integration status
        </span>
      </div>
    );
  }

  if (!auth.session) {
    const connectButton = (
      <button
        disabled
        className={cn([
          "w-full h-9 flex items-center justify-center text-sm font-medium transition-all rounded-lg",
          "bg-neutral-900 text-white opacity-50 cursor-not-allowed",
        ])}
      >
        Connect {config.displayName} Calendar
      </button>
    );

    return (
      <div className="px-1 pt-1 pb-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{connectButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Sign in to connect your calendar
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (!billing.isPro) {
    return (
      <div className="px-1 pt-1 pb-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            Pro
          </span>
          <span className="text-xs text-neutral-500">
            Required to connect {config.displayName} Calendar
          </span>
        </div>
        <button
          onClick={() => billing.upgradeToPro()}
          className={cn([
            "w-full h-9 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
            "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
          ])}
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return (
    <div className="px-1 pt-1 pb-2">
      <button
        onClick={handleConnect}
        className={cn([
          "w-full h-9 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
          "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
        ])}
      >
        Connect {config.displayName} Calendar
      </button>
    </div>
  );
}

async function openIntegrationUrl(
  nangoIntegrationId: string | undefined,
  connectionId: string | undefined,
  action: "connect" | "disconnect",
) {
  if (!nangoIntegrationId) return;
  const params: Record<string, string> = {
    action,
    integration_id: nangoIntegrationId,
    return_to: "calendar",
  };
  if (connectionId) {
    params.connection_id = connectionId;
  }
  const url = await buildWebAppUrl("/app/integration", params);
  await openerCommands.openUrl(url, null);
}
