import { useQuery } from "@tanstack/react-query";

import { listConnections } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";

import { env } from "@/env";
import { getAccessToken } from "@/functions/access-token";

function decodeUserId(token: string): string {
  const payload = JSON.parse(atob(token.split(".")[1])) as { sub?: string };
  if (!payload.sub) {
    throw new Error("Missing user id in access token");
  }
  return payload.sub;
}

export function useConnections() {
  const authQuery = useQuery({
    queryKey: ["integration-status", "auth"],
    queryFn: async () => {
      const token = await getAccessToken();
      return {
        token,
        userId: decodeUserId(token),
      };
    },
    retry: false,
  });

  return useQuery({
    queryKey: ["integration-status", authQuery.data?.userId],
    enabled: !!authQuery.data?.userId,
    queryFn: async () => {
      const client = createClient({
        baseUrl: env.VITE_API_URL,
        headers: { Authorization: `Bearer ${authQuery.data?.token}` },
      });
      const { data, error } = await listConnections({ client });
      if (error) {
        throw new Error("Failed to load integrations");
      }
      return data?.connections ?? [];
    },
  });
}
