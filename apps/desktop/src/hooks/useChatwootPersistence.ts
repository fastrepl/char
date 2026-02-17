import { useMemo } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import type { AgentMessage, ContactInfo, HelpChatConfig } from "@hypr/helpchat";
import { useHelpChat } from "@hypr/helpchat";

import { useAuth } from "../auth";
import { env } from "../env";

export type { AgentMessage } from "@hypr/helpchat";

export function useChatwootPersistence(
  userId: string | undefined,
  contactInfo?: ContactInfo,
  onHumanAgentMessage?: (message: AgentMessage) => void,
) {
  const { session } = useAuth();

  const config: HelpChatConfig = useMemo(
    () => ({
      apiBaseUrl: env.VITE_API_URL,
      accessToken: session?.access_token,
      fetchFn: tauriFetch as HelpChatConfig["fetchFn"],
    }),
    [session?.access_token],
  );

  return useHelpChat({
    config,
    userId,
    contactInfo,
    autoResume: true,
    onHumanAgentMessage,
  });
}
