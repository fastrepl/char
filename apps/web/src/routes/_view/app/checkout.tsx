import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { createCheckoutSession } from "@/functions/billing";
import {
  desktopRedirectUriSchema,
  desktopSchemeSchema,
} from "@/functions/desktop-flow";

const validateSearch = z.object({
  period: z.enum(["monthly", "yearly"]).catch("monthly"),
  flow: z.enum(["desktop", "web"]).default("web"),
  scheme: desktopSchemeSchema.optional(),
  redirect_uri: desktopRedirectUriSchema,
});

export const Route = createFileRoute("/_view/app/checkout")({
  validateSearch,
  beforeLoad: async ({ search }) => {
    const { url } = await createCheckoutSession({
      data: {
        period: search.period,
        flow: search.flow,
        scheme: search.scheme,
        redirect_uri: search.redirect_uri,
      },
    });

    if (url) {
      throw redirect({ href: url } as any);
    }

    throw redirect({ to: "/app/account/" });
  },
});
