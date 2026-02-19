import { useCallback, useEffect, useRef, useState } from "react";

import { useListener } from "../../contexts/listener";

export function useListenerStopTrigger(sessionId: string): {
  justStopped: boolean;
  reset: () => void;
} {
  const listenerStatus = useListener((state) => state.live.status);
  const liveSessionId = useListener((state) => state.live.sessionId);

  const [justStopped, setJustStopped] = useState(false);
  const prevStatusRef = useRef(listenerStatus);
  const prevSessionIdRef = useRef(liveSessionId);

  useEffect(() => {
    const wasActive =
      prevStatusRef.current === "active" ||
      prevStatusRef.current === "finalizing";
    const isNowInactive = listenerStatus === "inactive";
    const wasThisSession = prevSessionIdRef.current === sessionId;

    if (wasActive && isNowInactive && wasThisSession && !justStopped) {
      setJustStopped(true);
    }

    prevStatusRef.current = listenerStatus;
    prevSessionIdRef.current = liveSessionId;
  }, [listenerStatus, liveSessionId, sessionId, justStopped]);

  const reset = useCallback(() => {
    setJustStopped(false);
  }, []);

  return { justStopped, reset };
}
