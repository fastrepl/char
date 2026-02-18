import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/shallow";

import type { ShortcutId } from "@hypr/plugin-shortcut";

import { useNewNote, useNewNoteAndListen } from "../components/main/shared";
import { useListener } from "../contexts/listener";
import { useShell } from "../contexts/shell";
import { useTabs } from "../store/zustand/tabs";
import { useShortcutRegistry } from "./useShortcutRegistry";

export function useGlobalShortcuts() {
  const { shortcuts, keysMap } = useShortcutRegistry();

  const k = useCallback((id: ShortcutId) => keysMap.get(id) ?? "", [keysMap]);

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

  const ready = keysMap.size > 0;

  const hotkeysOptions = {
    preventDefault: true,
    enableOnFormTags: true as const,
    enableOnContentEditable: true,
    enabled: ready,
  };

  useHotkeys(
    k("new_note"),
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

  useHotkeys(k("new_empty_tab"), () => newEmptyTab(), hotkeysOptions, [
    newEmptyTab,
  ]);

  useHotkeys(
    k("close_tab"),
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

  const selectTabIds: ShortcutId[] = [
    "select_tab_1",
    "select_tab_2",
    "select_tab_3",
    "select_tab_4",
    "select_tab_5",
    "select_tab_6",
    "select_tab_7",
    "select_tab_8",
    "select_tab_9",
  ];

  const selectTabKeys = useMemo(
    () =>
      selectTabIds
        .map((id) => k(id))
        .filter(Boolean)
        .join(", "),
    [k],
  );

  useHotkeys(
    selectTabKeys,
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

  useHotkeys(k("prev_tab"), () => selectPrev(), hotkeysOptions, [selectPrev]);
  useHotkeys(k("next_tab"), () => selectNext(), hotkeysOptions, [selectNext]);
  useHotkeys(
    k("restore_closed_tab"),
    () => restoreLastClosedTab(),
    hotkeysOptions,
    [restoreLastClosedTab],
  );
  useHotkeys(
    k("open_calendar"),
    () => openNew({ type: "calendar" }),
    hotkeysOptions,
    [openNew],
  );
  useHotkeys(
    k("open_contacts"),
    () =>
      openNew({
        type: "contacts",
        state: { selectedOrganization: null, selectedPerson: null },
      }),
    hotkeysOptions,
    [openNew],
  );
  useHotkeys(
    k("open_ai_settings"),
    () => openNew({ type: "ai" }),
    hotkeysOptions,
    [openNew],
  );
  useHotkeys(
    k("open_folders"),
    () => openNew({ type: "folders", id: null }),
    hotkeysOptions,
    [openNew],
  );
  useHotkeys(
    k("open_search"),
    () => openNew({ type: "search" }),
    hotkeysOptions,
    [openNew],
  );
  useHotkeys(
    k("new_note_and_listen"),
    () => newNoteAndListen(),
    hotkeysOptions,
    [newNoteAndListen],
  );
  useHotkeys(
    k("toggle_chat"),
    () => transitionChatMode({ type: "TOGGLE" }),
    hotkeysOptions,
    [transitionChatMode],
  );
  useHotkeys(
    k("open_settings"),
    () => openNew({ type: "settings" }),
    { ...hotkeysOptions, splitKey: "|" },
    [openNew],
  );

  return { shortcuts };
}
