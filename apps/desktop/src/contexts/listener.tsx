import React, { createContext, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { events as detectEvents } from "@hypr/plugin-detect";
import { commands as notificationCommands } from "@hypr/plugin-notification";

import { useConfigValue } from "../config/use-config";
import {
  createListenerStore,
  type ListenerStore,
} from "../store/zustand/listener";

const ListenerContext = createContext<ListenerStore | null>(null);

export const ListenerProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: ListenerStore;
}) => {
  useHandleDetectEvents(store);

  const storeRef = useRef<ListenerStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
  }

  return (
    <ListenerContext.Provider value={storeRef.current}>
      {children}
    </ListenerContext.Provider>
  );
};

export const useListener = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createListenerStore>, T>
  >[1],
) => {
  const store = useContext(ListenerContext);

  if (!store) {
    throw new Error("'useListener' must be used within a 'ListenerProvider'");
  }

  return useStore(store, useShallow(selector));
};

const useHandleDetectEvents = (store: ListenerStore) => {
  const stop = useStore(store, (state) => state.stop);
  const setMuted = useStore(store, (state) => state.setMuted);
  const notificationDetectEnabled = useConfigValue("notification_detect");

  const notificationDetectEnabledRef = useRef(notificationDetectEnabled);
  useEffect(() => {
    notificationDetectEnabledRef.current = notificationDetectEnabled;
  }, [notificationDetectEnabled]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    let notificationTimerId: ReturnType<typeof setTimeout>;

    detectEvents.detectEvent
      .listen(({ payload }) => {
        if (payload.type === "micStarted") {
          if (!notificationDetectEnabledRef.current) {
            return;
          }

          notificationTimerId = setTimeout(() => {
            void notificationCommands.showNotification({
              key: payload.key,
              title: "Mic Started",
              message: "Mic started",
              timeout: { secs: 8, nanos: 0 },
              event_id: null,
              start_time: null,
              participants: null,
              event_details: null,
              action_label: null,
            });
          }, 2000);
        } else if (payload.type === "micStopped") {
          stop();
        } else if (payload.type === "sleepStateChanged") {
          if (payload.value) {
            stop();
          }
        } else if (payload.type === "micMuted") {
          setMuted(payload.value);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((err) => {
        console.error("Failed to setup detect event listener:", err);
      });

    return () => {
      cancelled = true;
      unlisten?.();
      if (notificationTimerId) {
        clearTimeout(notificationTimerId);
      }
    };
  }, [stop, setMuted]);
};
