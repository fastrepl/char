import { useCallback } from "react";

import { createClient } from "@hypr/api-client/client";

import { env } from "@/env";
import { getAccessToken } from "@/functions/access-token";

export type ApiClient = ReturnType<typeof createClient>;

export function useApiClient() {
  const getClient = useCallback(async (): Promise<ApiClient> => {
    const token = await getAccessToken();

    return createClient({
      baseUrl: env.VITE_API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });
  }, []);

  return { getClient };
}
