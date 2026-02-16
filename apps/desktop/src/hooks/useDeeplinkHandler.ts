import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";

import { events as deeplink2Events } from "@hypr/plugin-deeplink2";

import { useAuth } from "../auth";

export function useDeeplinkHandler() {
  const auth = useAuth();

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
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [auth]);
}
