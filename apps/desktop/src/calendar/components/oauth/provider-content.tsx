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
  const { data: connections } = useConnections();
  const connection = connections?.find(
    (c) => c.integration_id === config.nangoIntegrationId,
  );

  const handleConnect = useCallback(
    () =>
      openIntegrationUrl(config.nangoIntegrationId, connection?.connection_id),
    [config.nangoIntegrationId, connection?.connection_id],
  );

  if (connection) {
    const disabled = !auth.session || !billing.isPro;

    const reconnectButton = (
      <button
        onClick={handleConnect}
        disabled={disabled}
        className={cn([
          "text-xs text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
        ])}
      >
        Reconnect
      </button>
    );

    const tooltipMessage = !auth.session
      ? "Sign in to connect your calendar"
      : !billing.isPro
        ? "Upgrade to Pro to use this integration"
        : null;

    return (
      <div className="flex items-center justify-between px-1 pt-1 pb-2">
        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Connected
        </span>

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
) {
  if (!nangoIntegrationId) return;
  const params: Record<string, string> = {
    integration_id: nangoIntegrationId,
    return_to: "calendar",
  };
  if (connectionId) {
    params.connection_id = connectionId;
  }
  const url = await buildWebAppUrl("/app/integration", params);
  await openerCommands.openUrl(url, null);
}
