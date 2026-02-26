import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { canStartTrial as canStartTrialApi } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import {
  commands as authCommands,
  type Claims,
  type SubscriptionStatus,
} from "@hypr/plugin-auth";
import { commands as openerCommands } from "@hypr/plugin-opener2";

import { env } from "../env";
import { getScheme } from "../shared/utils";
import { useAuth } from "./context";

type TokenInfo = Omit<Claims, "sub"> & {
  trialEnd: Date | null;
};

const DEFAULT_TOKEN_INFO: TokenInfo = {
  entitlements: [],
  subscription_status: null,
  trialEnd: null,
};

async function getInfoFromToken(accessToken: string): Promise<TokenInfo> {
  const result = await authCommands.decodeClaims(accessToken);
  if (result.status === "error") {
    return DEFAULT_TOKEN_INFO;
  }
  const { sub, trial_end, ...rest } = result.data;
  return {
    ...rest,
    trialEnd: trial_end ? new Date(trial_end * 1000) : null,
  };
}

type BillingContextValue = {
  entitlements: string[];
  subscriptionStatus: SubscriptionStatus | null;
  isReady: boolean;
  isPro: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  canStartTrial: { data: boolean; isPending: boolean };
  upgradeToPro: () => void;
};

export type BillingAccess = BillingContextValue;

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const tokenInfoQuery = useQuery({
    queryKey: ["tokenInfo", auth?.session?.access_token ?? ""],
    queryFn: () => getInfoFromToken(auth!.session!.access_token),
    enabled: !!auth?.session?.access_token,
  });

  const tokenInfo = tokenInfoQuery.data ?? DEFAULT_TOKEN_INFO;
  const entitlements = tokenInfo.entitlements ?? [];
  const subscriptionStatus = tokenInfo.subscription_status ?? null;
  const isReady = !tokenInfoQuery.isPending;
  const isPro = entitlements.includes("hyprnote_pro");
  const isTrialing = subscriptionStatus === "trialing";

  const trialDaysRemaining = useMemo(() => {
    if (!tokenInfo.trialEnd) {
      return null;
    }
    const secondsRemaining = (tokenInfo.trialEnd.getTime() - Date.now()) / 1000;
    if (secondsRemaining <= 0) {
      return 0;
    }
    return Math.ceil(secondsRemaining / (24 * 60 * 60));
  }, [tokenInfo.trialEnd]);

  const canTrialQuery = useQuery({
    enabled: !!auth?.session && !isPro,
    queryKey: [auth?.session?.user.id ?? "", "canStartTrial"],
    queryFn: async () => {
      const headers = auth?.getHeaders();
      if (!headers) {
        return false;
      }
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { data, error } = await canStartTrialApi({ client });
      if (error) {
        return false;
      }
      return data?.canStartTrial ?? false;
    },
  });

  const canStartTrial = useMemo(
    () => ({
      data: isPro ? false : (canTrialQuery.data ?? false),
      isPending: canTrialQuery.isPending,
    }),
    [isPro, canTrialQuery.data, canTrialQuery.isPending],
  );

  const upgradeToPro = useCallback(async () => {
    const scheme = await getScheme();
    void openerCommands.openUrl(
      `${env.VITE_APP_URL}/app/checkout?period=monthly&scheme=${scheme}`,
      null,
    );
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      entitlements,
      subscriptionStatus,
      isReady,
      isPro,
      isTrialing,
      trialDaysRemaining,
      canStartTrial,
      upgradeToPro,
    }),
    [
      entitlements,
      subscriptionStatus,
      isReady,
      isPro,
      isTrialing,
      trialDaysRemaining,
      canStartTrial,
      upgradeToPro,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBillingAccess() {
  const context = useContext(BillingContext);

  if (!context) {
    throw new Error("useBillingAccess must be used within BillingProvider");
  }

  return context;
}
