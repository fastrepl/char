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
  const queryClient = useQueryClient();

  const jwtQuery = useQuery({
    queryKey: ["billing", "jwt"],
    queryFn: async () => {
      const token = await getAccessToken();
      return deriveBillingInfo(decodeJwtPayload(token));
    },
    retry: false,
  });

  const stripeQuery = useQuery({
    queryKey: ["billing", "stripe"],
    queryFn: async () => deriveFromStripe(await syncAfterSuccess()),
    retry: false,
  });

  const billing: BillingInfo =
    stripeQuery.data ?? jwtQuery.data ?? DEFAULT_BILLING;
  const isReady = !jwtQuery.isPending;
  const isVerified = !stripeQuery.isPending;

  const refreshBilling = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.refreshSession();
    await queryClient.invalidateQueries({ queryKey: ["billing"] });
  }, [queryClient]);

  return {
    ...billing,
    isReady,
    isVerified,
    refreshBilling,
  };
}
