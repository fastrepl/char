import { platform } from "@tauri-apps/plugin-os";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";

import { usePermission } from "../../../../hooks/usePermissions";
import { AppleCalendarSelection } from "./apple/calendar-selection";
import { SyncProvider } from "./apple/context";
import { AccessPermissionRow } from "./apple/permission";
import { OAuthProviderContent } from "./oauth/provider-content";
import { PROVIDERS } from "./shared";

export function CalendarSidebarContent() {
  const isMacos = platform() === "macos";
  const calendar = usePermission("calendar");
  const contacts = usePermission("contacts");

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <Accordion type="single" collapsible defaultValue="apple">
      {visibleProviders.map((provider) =>
        provider.disabled ? (
          <div
            key={provider.id}
            className="flex items-center gap-2 py-2 opacity-50"
          >
            {provider.icon}
            <span className="text-sm font-medium">{provider.displayName}</span>
            {provider.badge && (
              <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
                {provider.badge}
              </span>
            )}
          </div>
        ) : (
          <AccordionItem
            key={provider.id}
            value={provider.id}
            className="border-none"
          >
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                {provider.icon}
                <span className="text-sm font-medium">
                  {provider.displayName}
                </span>
                {provider.badge && (
                  <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
                    {provider.badge}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              {provider.id === "apple" && (
                <div className="flex flex-col gap-3">
                  {(calendar.status !== "authorized" ||
                    contacts.status !== "authorized") && (
                    <div className="flex flex-col gap-1">
                      {calendar.status !== "authorized" && (
                        <AccessPermissionRow
                          title="Calendar"
                          status={calendar.status}
                          isPending={calendar.isPending}
                          onOpen={calendar.open}
                          onRequest={calendar.request}
                          onReset={calendar.reset}
                        />
                      )}
                      {contacts.status !== "authorized" && (
                        <AccessPermissionRow
                          title="Contacts"
                          status={contacts.status}
                          isPending={contacts.isPending}
                          onOpen={contacts.open}
                          onRequest={contacts.request}
                          onReset={contacts.reset}
                        />
                      )}
                    </div>
                  )}
                  {calendar.status === "authorized" && (
                    <SyncProvider>
                      <AppleCalendarSelection />
                    </SyncProvider>
                  )}
                </div>
              )}
              {provider.nangoIntegrationId && (
                <OAuthProviderContent config={provider} />
              )}
            </AccordionContent>
          </AccordionItem>
        ),
      )}
    </Accordion>
  );
}
