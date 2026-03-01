import { useEffect, useState } from "react";

import {
  type ContextEntity,
  CURRENT_SESSION_CONTEXT_KEY,
} from "~/chat/context-item";
import { hydrateSessionContextFromFs } from "~/chat/session-context-hydrator";
import * as main from "~/store/tinybase/store/main";

export function useSessionContextEntity(
  currentSessionId?: string,
): Extract<ContextEntity, { kind: "session" }> | null {
  const store = main.UI.useStore(main.STORE_ID);
  const [entity, setEntity] = useState<Extract<
    ContextEntity,
    { kind: "session" }
  > | null>(null);

  useEffect(() => {
    if (!currentSessionId || !store) {
      setEntity(null);
      return;
    }

    let stale = false;

    hydrateSessionContextFromFs(store, currentSessionId).then((sc) => {
      if (stale) return;
      if (!sc) {
        setEntity(null);
        return;
      }
      setEntity({
        kind: "session",
        key: CURRENT_SESSION_CONTEXT_KEY,
        source: "auto-current",
        sessionId: currentSessionId,
        sessionContext: sc,
      });
    });

    return () => {
      stale = true;
    };
  }, [currentSessionId, store]);

  return entity;
}
