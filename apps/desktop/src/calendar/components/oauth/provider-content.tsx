import { useCallback, useMemo } from "react";
import { useAuth } from "~/auth";
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

function useValidation(auth: { session: unknown }) {
  return useMemo(() => {
    if (!auth.session) {
      return "Sign in to connect your calendar";
    }
    return null;
  }, [auth.session]);
}

export function OAuthProviderContent({ config }: { config: CalendarProvider }) {
  const auth = useAuth();
  const { data: connections } = useConnections();
  const connection = connections?.find(
    (c) => c.integration_id === config.nangoIntegrationId,
  );

  const validationMessage = useValidation(auth);
  const disabled = validationMessage !== null;

  const handleConnect = useCallback(
    () =>
      openIntegrationUrl(config.nangoIntegrationId, connection?.connection_id),
    [config.nangoIntegrationId, connection?.connection_id],
  );

  if (connection) {
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

    return (
      <div className="flex items-center justify-between px-1 pt-1 pb-2">
        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Connected
        </span>

        {validationMessage ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{reconnectButton}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{validationMessage}</TooltipContent>
          </Tooltip>
        ) : (
          reconnectButton
        )}
      </div>
    );
  }

  const connectButton = (
    <button
      onClick={handleConnect}
      disabled={disabled}
      className={cn([
        "w-full h-9 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
        "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
        disabled && "opacity-50 cursor-not-allowed",
      ])}
    >
      Connect {config.displayName} Calendar
    </button>
  );

  return (
    <div className="px-1 pt-1 pb-2">
      {validationMessage ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{connectButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{validationMessage}</TooltipContent>
        </Tooltip>
      ) : (
        connectButton
      )}
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
