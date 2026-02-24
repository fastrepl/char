import { useEffect } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useCalendarPersister } from "../persister/calendar";
import { useChatPersister } from "../persister/chat";
import { useChatShortcutPersister } from "../persister/chat-shortcuts";
import { useEventsPersister } from "../persister/events";
import { useHumanPersister } from "../persister/human";
import { useMemoryPersister } from "../persister/memory";
import { useOrganizationPersister } from "../persister/organization";
import { usePromptPersister } from "../persister/prompts";
import { useSessionPersister } from "../persister/session";
import { useTemplatePersister } from "../persister/templates";
import { useValuesPersister } from "../persister/values";
import { useInitializeStore } from "./initialize";
import { type Store } from "./main";
import { registerSaveHandler } from "./save";

export function useMainPersisters(store: Store) {
  const valuesPersister = useValuesPersister(store);
  const sessionPersister = useSessionPersister(store);
  const organizationPersister = useOrganizationPersister(store);
  const humanPersister = useHumanPersister(store);
  const eventPersister = useEventsPersister(store);
  const chatPersister = useChatPersister(store);
  const chatShortcutPersister = useChatShortcutPersister(store);
  const promptPersister = usePromptPersister(store);
  const templatePersister = useTemplatePersister(store);
  const calendarPersister = useCalendarPersister(store);
  const memoryPersister = useMemoryPersister(store);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    const persisters = [
      { id: "values", persister: valuesPersister },
      { id: "session", persister: sessionPersister },
      { id: "organization", persister: organizationPersister },
      { id: "human", persister: humanPersister },
      { id: "event", persister: eventPersister },
      { id: "chat", persister: chatPersister },
      { id: "chatShortcut", persister: chatShortcutPersister },
      { id: "prompt", persister: promptPersister },
      { id: "template", persister: templatePersister },
      { id: "calendar", persister: calendarPersister },
      { id: "memory", persister: memoryPersister },
    ];

    const unsubscribes = persisters
      .filter(({ persister }) => persister)
      .map(({ id, persister }) =>
        registerSaveHandler(id, async () => {
          await persister!.save();
        }),
      );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [
    valuesPersister,
    sessionPersister,
    organizationPersister,
    humanPersister,
    eventPersister,
    chatPersister,
    chatShortcutPersister,
    promptPersister,
    templatePersister,
    calendarPersister,
    memoryPersister,
  ]);

  useInitializeStore(store, {
    session: sessionPersister,
    human: humanPersister,
    values: valuesPersister,
  });

  return {
    valuesPersister,
    sessionPersister,
    organizationPersister,
    humanPersister,
    eventPersister,
    chatPersister,
    chatShortcutPersister,
    promptPersister,
    templatePersister,
    calendarPersister,
    memoryPersister,
  };
}
