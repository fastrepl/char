import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { createCheckoutSession } from "@/functions/billing";

const VALID_SCHEMES = [
  "hyprnote",
  "hyprnote-nightly",
  "hyprnote-staging",
  "hypr",
] as const;

const validateSearch = z.object({
  period: z.enum(["monthly", "yearly"]).catch("monthly"),
  scheme: z.enum(VALID_SCHEMES).optional(),
});

export const Route = createFileRoute("/_view/app/checkout")({
  validateSearch,
  beforeLoad: async ({ search }) => {
    const { url } = await createCheckoutSession({
      data: { period: search.period, scheme: search.scheme },
    });

    if (url) {
      throw redirect({ href: url } as any);
    }

    throw redirect({ to: "/app/account/" });
  },
});
