import { useEffect, useRef, useState } from "react";

import { useListener } from "../contexts/listener";
import { getEnhancerService } from "../services/enhancer";
import * as main from "../store/tinybase/store/main";
import type { Tab } from "../store/zustand/tabs/schema";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const [skipReason, setSkipReason] = useState<string | null>(null);

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const loading = useListener((state) => state.live.loading);
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const prevSessionModeRef = useRef(sessionMode);
  const prevTranscriptCountRef = useRef(transcriptIds?.length ?? 0);
  const isInitialRenderRef = useRef(true);

  useEffect(() => {
    const service = getEnhancerService();
    if (!service) return;
    return service.on((event) => {
      if (event.sessionId !== sessionId) return;
      if (event.type === "auto-enhance-skipped") {
        setSkipReason(event.reason);
      }
    });
  }, [sessionId]);

  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      prevSessionModeRef.current = sessionMode;
      prevTranscriptCountRef.current = transcriptIds?.length ?? 0;
      return;
    }

    const prevMode = prevSessionModeRef.current;
    const prevCount = prevTranscriptCountRef.current;
    const currentCount = transcriptIds?.length ?? 0;

    prevSessionModeRef.current = sessionMode;
    prevTranscriptCountRef.current = currentCount;

    const batchJustCompleted =
      prevMode === "running_batch" && sessionMode === "inactive";
    const transcriptJustUploaded =
      prevCount === 0 &&
      currentCount > 0 &&
      prevMode === "inactive" &&
      sessionMode === "inactive" &&
      !loading;

    if (batchJustCompleted || transcriptJustUploaded) {
      const service = getEnhancerService();
      service?.queueAutoEnhance(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMode, transcriptIds?.length, loading]);

  useEffect(() => {
    if (skipReason) {
      const timer = setTimeout(() => setSkipReason(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [skipReason]);

  return { skipReason };
}
