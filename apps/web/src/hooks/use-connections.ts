import { useQuery } from "@tanstack/react-query";

import { listConnections } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";

import { env } from "@/env";
import { getAccessToken } from "@/functions/access-token";

export function useConnections() {
  return useQuery({
    queryKey: ["integration-status"],
    queryFn: async () => {
      const token = await getAccessToken();
      const client = createClient({
        baseUrl: env.VITE_API_URL,
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data, error } = await listConnections({ client });
      if (error) {
        return [];
      }
      return data?.connections ?? [];
    },
  });
}
