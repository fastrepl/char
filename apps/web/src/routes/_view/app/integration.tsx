import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useBilling } from "@/hooks/use-billing";

import { IntegrationPageLayout } from "./-integration-ui";
import { ConnectFlow } from "./-integrations-connect-flow";
import { DisconnectFlow } from "./-integrations-disconnect-flow";
import { UpgradePrompt } from "./-integrations-upgrade-prompt";

const validateSearch = z.object({
  integration_id: z.string().default("google-calendar"),
  connection_id: z.string().optional(),
  action: z.enum(["connect", "disconnect"]).default("connect"),
  flow: z.enum(["desktop", "web"]).default("web"),
  scheme: z.string().default("hyprnote"),
  return_to: z.string().optional(),
});

export const INTEGRATION_DISPLAY: Record<
  string,
  { name: string; description: string; connectingHint: string }
> = {
  "google-calendar": {
    name: "Google Calendar",
    description: "Connect your Google Calendar to sync your meetings",
    connectingHint: "Follow the prompts to connect your Google account",
  },
};

export function getIntegrationDisplay(integrationId: string) {
  return (
    INTEGRATION_DISPLAY[integrationId] ?? {
      name: integrationId,
      description: `Connect ${integrationId} to sync your data`,
      connectingHint: "Follow the prompts to complete the connection",
    }
  );
}

export const Route = createFileRoute("/_view/app/integration")({
  validateSearch,
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

function Component() {
  const search = Route.useSearch();
  const billing = useBilling();
  const desktopRefreshStartedRef = useRef(false);
  const [isSyncingDesktopBilling, setIsSyncingDesktopBilling] = useState(false);

  useEffect(() => {
    if (search.flow !== "desktop" || desktopRefreshStartedRef.current) {
      return;
    }

    desktopRefreshStartedRef.current = true;
    setIsSyncingDesktopBilling(true);
    void billing
      .refreshBilling()
      .catch(() => {})
      .finally(() => setIsSyncingDesktopBilling(false));
  }, [billing.refreshBilling, search.flow]);

  if (!billing.isReady || isSyncingDesktopBilling) {
    return (
      <IntegrationPageLayout>
        <p className="text-neutral-500">Loading...</p>
      </IntegrationPageLayout>
    );
  }

  if (search.action === "disconnect") {
    return <DisconnectFlow />;
  }

  if (!billing.isPro) {
    return (
      <UpgradePrompt
        integrationId={search.integration_id}
        flow={search.flow}
        scheme={search.scheme}
      />
    );
  }

  return <ConnectFlow />;
}
