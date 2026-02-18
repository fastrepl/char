import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/shallow";

import { commands as shortcutCommands } from "@hypr/plugin-shortcut";

import { useListener } from "../contexts/listener";
import { useShell } from "../contexts/shell";
import { useNewNote, useNewNoteAndListen } from "../components/main/shared";
import { useTabs } from "../store/zustand/tabs";

export function useGlobalShortcuts() {
  const { data: shortcuts } = useQuery({
    queryKey: ["shortcuts", "all"],
    queryFn: () => shortcutCommands.getAllShortcuts(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const {
    tabs,
    currentTab,
    close,
    select,
    selectNext,
    selectPrev,
    restoreLastClosedTab,
    openNew,
    unpin,
    setPendingCloseConfirmationTab,
    transitionChatMode,
  } = useTabs(
    useShallow((state) => ({
      tabs: state.tabs,
      currentTab: state.currentTab,
      close: state.close,
      select: state.select,
      selectNext: state.selectNext,
      selectPrev: state.selectPrev,
      restoreLastClosedTab: state.restoreLastClosedTab,
      openNew: state.openNew,
      unpin: state.unpin,
      setPendingCloseConfirmationTab: state.setPendingCloseConfirmationTab,
      transitionChatMode: state.transitionChatMode,
    })),
  );

  const liveSessionId = useListener((state) => state.live.sessionId);
  const liveStatus = useListener((state) => state.live.status);
  const isListening = liveStatus === "active" || liveStatus === "finalizing";
  const { chat } = useShell();

  const newNote = useNewNote({ behavior: "new" });
  const newNoteCurrent = useNewNote({ behavior: "current" });
  const newNoteAndListen = useNewNoteAndListen();

  const newEmptyTab = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  const hotkeysOptions = {
    preventDefault: true,
    enableOnFormTags: true as const,
    enableOnContentEditable: true,
  };

  useHotkeys(
    "mod+n",
    () => {
      if (currentTab?.type === "empty") {
        newNoteCurrent();
      } else {
        newNote();
      }
    },
    hotkeysOptions,
    [currentTab, newNote, newNoteCurrent],
  );

  useHotkeys(
    "mod+t",
    () => newEmptyTab(),
    hotkeysOptions,
    [newEmptyTab],
  );

  useHotkeys(
    "mod+w",
    async () => {
      if (currentTab) {
        const isCurrentTabListening =
          isListening &&
          currentTab.type === "sessions" &&
          currentTab.id === liveSessionId;
        if (isCurrentTabListening) {
          setPendingCloseConfirmationTab(currentTab);
        } else if (currentTab.pinned) {
          unpin(currentTab);
        } else {
          if (currentTab.type === "chat_support") {
            chat.sendEvent({ type: "CLOSE" });
          }
          close(currentTab);
        }
      }
    },
    hotkeysOptions,
    [
      currentTab,
      close,
      unpin,
      isListening,
      liveSessionId,
      setPendingCloseConfirmationTab,
      chat,
    ],
  );

  useHotkeys(
    "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
    (event) => {
      const key = event.key;
      const targetIndex =
        key === "9" ? tabs.length - 1 : Number.parseInt(key, 10) - 1;
      const target = tabs[targetIndex];
      if (target) {
        select(target);
      }
    },
    hotkeysOptions,
    [tabs, select],
  );

  useHotkeys("mod+alt+left", () => selectPrev(), hotkeysOptions, [selectPrev]);
  useHotkeys("mod+alt+right", () => selectNext(), hotkeysOptions, [selectNext]);
  useHotkeys("mod+shift+t", () => restoreLastClosedTab(), hotkeysOptions, [restoreLastClosedTab]);
  useHotkeys("mod+shift+c", () => openNew({ type: "calendar" }), hotkeysOptions, [openNew]);
  useHotkeys(
    "mod+shift+o",
    () => openNew({ type: "contacts", state: { selectedOrganization: null, selectedPerson: null } }),
    hotkeysOptions,
    [openNew],
  );
  useHotkeys("mod+shift+comma", () => openNew({ type: "ai" }), hotkeysOptions, [openNew]);
  useHotkeys("mod+shift+l", () => openNew({ type: "folders", id: null }), hotkeysOptions, [openNew]);
  useHotkeys("mod+shift+f", () => openNew({ type: "search" }), hotkeysOptions, [openNew]);
  useHotkeys("mod+shift+n", () => newNoteAndListen(), hotkeysOptions, [newNoteAndListen]);
  useHotkeys(
    "mod+j",
    () => transitionChatMode({ type: "TOGGLE" }),
    hotkeysOptions,
    [transitionChatMode],
  );
  useHotkeys(
    "mod+,",
    () => openNew({ type: "settings" }),
    { ...hotkeysOptions, splitKey: "|" },
    [openNew],
  );

  return { shortcuts };
}
