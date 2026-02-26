import { type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useConfigValue } from "~/shared/config";
import * as main from "~/store/tinybase/store/main";
import {
  createSession,
  getOrCreateSessionForEventId,
} from "~/store/tinybase/store/sessions";
import { useTabs } from "~/store/zustand/tabs";

import { events as notificationEvents } from "@hypr/plugin-notification";
import {
  commands as updaterCommands,
  events as updaterEvents,
} from "@hypr/plugin-updater2";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

function useUpdaterEvents() {
  const openNew = useTabs((state) => state.openNew);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlisten: UnlistenFn | null = null;

    void updaterEvents.updatedEvent
      .listen(({ payload: { previous, current } }) => {
        openNew({
          type: "changelog",
          state: { previous, current },
        });
      })
      .then((f) => {
        unlisten = f;
        updaterCommands.maybeEmitUpdated();
      });

    return () => {
      unlisten?.();
    };
  }, [openNew]);
}

function useNotificationEvents() {
  const store = main.UI.useStore(main.STORE_ID);
  const openNew = useTabs((state) => state.openNew);
  const timezone = useConfigValue("timezone") || undefined;
  const pendingAutoStart = useRef<{ eventId: string | null } | null>(null);
  const storeRef = useRef(store);
  const openNewRef = useRef(openNew);
  const timezoneRef = useRef(timezone);

  useEffect(() => {
    storeRef.current = store;
    openNewRef.current = openNew;
    timezoneRef.current = timezone;
  }, [store, openNew, timezone]);

  useEffect(() => {
    if (pendingAutoStart.current && store) {
      const { eventId } = pendingAutoStart.current;
      const timezone = timezoneRef.current;
      pendingAutoStart.current = null;
      const sessionId = eventId
        ? getOrCreateSessionForEventId(store, eventId, undefined, timezone)
        : createSession(store);
      openNew({
        type: "sessions",
        id: sessionId,
        state: { view: null, autoStart: true },
      });
    }
  }, [store, openNew]);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    void notificationEvents.notificationEvent
      .listen(({ payload }) => {
        if (
          payload.type === "notification_confirm" ||
          payload.type === "notification_accept"
        ) {
          const eventId =
            payload.source?.type === "calendar_event"
              ? payload.source.event_id
              : null;
          const currentStore = storeRef.current;
          if (!currentStore) {
            pendingAutoStart.current = { eventId };
            return;
          }
          const sessionId = eventId
            ? getOrCreateSessionForEventId(
                currentStore,
                eventId,
                undefined,
                timezoneRef.current,
              )
            : createSession(currentStore);
          openNewRef.current({
            type: "sessions",
            id: sessionId,
            state: { view: null, autoStart: true },
          });
        } else if (payload.type === "notification_option_selected") {
          const currentStore = storeRef.current;
          if (!currentStore) return;

          const selectedIndex = payload.selected_index;
          const eventIds =
            payload.source?.type === "mic_detected"
              ? (payload.source.event_ids ?? [])
              : [];

          const sessionId =
            selectedIndex < eventIds.length
              ? getOrCreateSessionForEventId(
                  currentStore,
                  eventIds[selectedIndex],
                  undefined,
                  timezoneRef.current,
                )
              : createSession(currentStore);

          openNewRef.current({
            type: "sessions",
            id: sessionId,
            state: { view: null, autoStart: true },
          });
        }
      })
      .then((f) => {
        if (cancelled) {
          f();
        } else {
          unlisten = f;
        }
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}

export function EventListeners() {
  useUpdaterEvents();
  useNotificationEvents();

  return null;
}
