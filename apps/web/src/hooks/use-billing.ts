import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  type BillingInfo,
  deriveBillingInfo,
  type SubscriptionStatus,
  type SupabaseJwtPayload,
} from "@hypr/supabase";

import { getAccessToken } from "@/functions/access-token";
import { syncAfterSuccess } from "@/functions/billing";
import { getSupabaseBrowserClient } from "@/functions/supabase";

function decodeJwtPayload(token: string): SupabaseJwtPayload {
  return JSON.parse(atob(token.split(".")[1]));
}

function deriveFromStripe(
  stripeData: Awaited<ReturnType<typeof syncAfterSuccess>>,
): BillingInfo {
  if (!stripeData || stripeData.status === "none") {
    return deriveBillingInfo(null);
  }

  const status = stripeData.status as SubscriptionStatus;
  const isPro = status === "active" || status === "trialing";

  return deriveBillingInfo({
    entitlements: isPro ? ["hyprnote_pro"] : [],
    subscription_status: status,
  });
}

const DEFAULT_BILLING = deriveBillingInfo(null);

export function useBilling() {
  const jwtQuery = useQuery({
    queryKey: ["billing", "jwt"],
    queryFn: async () => {
      const token = await getAccessToken();
      console.log("decodeJwtPayload", decodeJwtPayload(token));
      return deriveBillingInfo(decodeJwtPayload(token));
    },
  });

  const stripeQuery = useQuery({
    queryKey: ["billing", "stripe"],
    queryFn: async () => deriveFromStripe(await syncAfterSuccess()),
  });

  const billing: BillingInfo =
    stripeQuery.data ?? jwtQuery.data ?? DEFAULT_BILLING;
  const isReady = !jwtQuery.isPending;
  const isVerified = !stripeQuery.isPending;

  const refreshBilling = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.refreshSession();
    console.log("refreshBilling");
    await jwtQuery.refetch();
    await stripeQuery.refetch();
    console.log("refreshBilling done");
  }, [jwtQuery, stripeQuery]);

  return {
    ...billing,
    isReady,
    isVerified,
    refreshBilling,
  };
}
