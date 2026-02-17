import { platform } from "@tauri-apps/plugin-os";

import { Accordion } from "@hypr/ui/components/ui/accordion";

import { PROVIDERS } from "../shared";
import { AppleCalendarProviderCard } from "./apple";
import { DisabledProviderCard } from "./disabled";
import { OAuthProviderCard } from "./oauth";

export function ConfigureProviders() {
  const isMacos = platform() === "macos";

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <Accordion type="single" collapsible className="flex flex-col gap-3">
      {visibleProviders.map((provider) =>
        provider.disabled ? (
          <DisabledProviderCard key={provider.id} config={provider} />
        ) : provider.id === "apple" ? (
          <AppleCalendarProviderCard key={provider.id} />
        ) : provider.nangoIntegrationId ? (
          <OAuthProviderCard key={provider.id} config={provider} />
        ) : null,
      )}
    </Accordion>
  );
}
