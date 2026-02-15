import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";

import { usePermission } from "../../../../../hooks/usePermissions";
import { StyledStreamdown } from "../../../ai/shared";
import { PROVIDERS } from "../../shared";
import { AppleCalendarSelection } from "./calendar-selection";
import { SyncProvider } from "./context";
import { ApplePermissions } from "./permission";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AppleCalendarProviderCard() {
  const config = PROVIDERS.find((p) => p.id === "apple")!;
  const calendar = usePermission("calendar");

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
            Sync events from your **macOS Calendar** app. Requires calendar and
            contacts permissions.
          </StyledStreamdown>
          <button
            onClick={() => openerCommands.openUrl(config.docsPath, null)}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Docs ↗
          </button>
        </div>

        <Section title="Permissions">
          <ApplePermissions />
        </Section>

        {calendar.status === "authorized" && (
          <SyncProvider>
            <AppleCalendarSelection calendarClassName="border rounded-lg" />
          </SyncProvider>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
