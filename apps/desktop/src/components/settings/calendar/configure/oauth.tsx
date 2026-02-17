import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { buildWebAppUrl } from "../../../../utils";
import { StyledStreamdown } from "../../ai/shared";
import { PROVIDERS } from "../shared";

export function OAuthProviderCard({
  config,
}: {
  config: (typeof PROVIDERS)[number];
}) {
  const auth = useAuth();

  const handleConnect = async () => {
    if (!config.nangoIntegrationId) return;
    const url = await buildWebAppUrl("/app/integration", {
      integration_id: config.nangoIntegrationId,
    });
    await openerCommands.openUrl(url, null);
  };

  return (
    <AccordionItem
      value={config.id}
      className="rounded-xl border-2 border-dashed bg-neutral-50"
    >
      <AccordionTrigger className="capitalize gap-2 px-4">
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
          {config.badge && (
            <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
              {config.badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <StyledStreamdown>
            Connect your **{config.displayName} Calendar** to sync meetings.
            Opens your browser to authenticate.
          </StyledStreamdown>
          <button
            onClick={() => openerCommands.openUrl(config.docsPath, null)}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Docs ↗
          </button>
        </div>

        <button
          onClick={handleConnect}
          disabled={!auth.session}
          className={cn([
            "w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer rounded-lg",
            "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[98%]",
            !auth.session && "opacity-50 cursor-not-allowed",
          ])}
        >
          Connect {config.displayName} Calendar
        </button>
      </AccordionContent>
    </AccordionItem>
  );
}
