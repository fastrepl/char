import { useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useAuth } from "~/auth";

import { events as deeplink2Events } from "@hypr/plugin-deeplink2";

export function useDeeplinkHandler() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const unlisten = deeplink2Events.deepLinkEvent.listen(({ payload }) => {
      if (payload.to === "/auth/callback") {
        const { access_token, refresh_token } = payload.search;
        if (access_token && refresh_token && auth) {
          void auth.setSessionFromTokens(access_token, refresh_token);
        }
      } else if (payload.to === "/billing/refresh") {
        if (auth) {
          void auth.refreshSession();
        }
      } else if (payload.to === "/integration/callback") {
        const { integration_id, status } = payload.search;
        if (status === "success") {
          console.log(`[deeplink] integration connected: ${integration_id}`);
          void queryClient.invalidateQueries({
            queryKey: ["integration-status"],
          });
        }
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [auth, queryClient]);
}
