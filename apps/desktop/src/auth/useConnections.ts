import { useQuery } from "@tanstack/react-query";
import { env } from "~/env";

import { listConnections } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";

import { useAuth } from "./context";

export function useConnections() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["integration-status"],
    queryFn: async () => {
      const headers = auth?.getHeaders();
      if (!headers) {
        return [];
      }
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { data, error } = await listConnections({ client });
      if (error) {
        return [];
      }
      return data?.connections ?? [];
    },
    enabled: !!auth?.session,
  });
}
