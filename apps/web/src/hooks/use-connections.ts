import { useQuery } from "@tanstack/react-query";

import { listConnections } from "@hypr/api-client";

import { getAccessToken } from "@/functions/access-token";
import { useApiClient } from "@/hooks/use-api-client";

function decodeUserId(token: string): string {
  const payload = JSON.parse(atob(token.split(".")[1])) as { sub?: string };
  if (!payload.sub) {
    throw new Error("Missing user id in access token");
  }
  return payload.sub;
}

export function useConnections({ enabled = true }: { enabled?: boolean } = {}) {
  const { getClient } = useApiClient();

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
    enabled: !!authQuery.data?.userId && enabled,
    queryFn: async () => {
      const client = await getClient();
      const { data, error } = await listConnections({ client });
      if (error) {
        throw new Error("Failed to load integrations");
      }
      return data?.connections ?? [];
    },
  });
}
