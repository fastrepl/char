import { useCallback, useMemo } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../../auth";
import { useConnections } from "../../../../../hooks/useConnections";
import { buildWebAppUrl } from "../../../../../utils";
import type { CalendarProvider } from "../shared";

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

  const handleConnect = useCallback(async () => {
    if (!config.nangoIntegrationId) return;
    const url = await buildWebAppUrl("/app/integration", {
      integration_id: config.nangoIntegrationId,
      return_to: "calendar",
    });
    await openerCommands.openUrl(url, null);
  }, [config.nangoIntegrationId]);

  const button = (
    <button
      onClick={handleConnect}
      disabled={disabled}
      className={cn([
        "w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
        connection
          ? "bg-neutral-200 text-neutral-600 hover:bg-neutral-300 active:scale-[98%]"
          : "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
        disabled && "opacity-50 cursor-not-allowed",
      ])}
    >
      {connection ? "Reconnect" : "Connect"} {config.displayName} Calendar
    </button>
  );

  return (
    <div className="flex flex-col gap-3 px-1 pt-1 pb-2">
      {connection && (
        <span className="text-xs text-green-600 font-light border border-green-300 rounded-full px-2 w-fit">
          Connected
        </span>
      )}

      {validationMessage ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{validationMessage}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  );
}
