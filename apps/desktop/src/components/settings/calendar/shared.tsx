import { Icon } from "@iconify-icon/react";
import type { ReactNode } from "react";

import { OutlookIcon } from "@hypr/ui/components/icons/outlook";

type CalendarProvider = {
  disabled: boolean;
  id: string;
  displayName: string;
  icon: ReactNode;
  badge?: string | null;
  platform?: "macos" | "all";
  docsPath: string;
  nangoIntegrationId?: string;
};

export type CalendarProviderId = (typeof _PROVIDERS)[number]["id"];

const _PROVIDERS = [
  {
    disabled: false,
    id: "apple",
    displayName: "Apple",
    badge: "Beta",
    icon: <Icon icon="logos:apple" width={20} height={20} />,
    platform: "macos",
    docsPath: "https://hyprnote.com/docs/calendar/apple",
  },
  {
    disabled: false,
    id: "google",
    displayName: "Google",
    badge: "Beta",
    icon: <Icon icon="logos:google-calendar" width={20} height={20} />,
    platform: "all",
    docsPath: "https://hyprnote.com/docs/calendar/gcal",
    nangoIntegrationId: "google-calendar",
  },
  {
    disabled: true,
    id: "outlook",
    displayName: "Outlook",
    badge: "Coming soon",
    icon: <OutlookIcon size={20} />,
    platform: "all",
    docsPath: "https://hyprnote.com/docs/calendar/outlook",
    nangoIntegrationId: "outlook-calendar",
  },
] as const satisfies readonly CalendarProvider[];

export const PROVIDERS = [..._PROVIDERS];
