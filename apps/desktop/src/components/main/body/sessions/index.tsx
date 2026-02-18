import { useQuery } from "@tanstack/react-query";
import { convertFileSrc } from "@tauri-apps/api/core";
import { StickyNoteIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { cn } from "@hypr/utils";

import AudioPlayer from "../../../../contexts/audio-player";
import { useListener } from "../../../../contexts/listener";
import { useShell } from "../../../../contexts/shell";
import { useAutoEnhance } from "../../../../hooks/useAutoEnhance";
import { useIsSessionEnhancing } from "../../../../hooks/useEnhancedNotes";
import { useStartListening } from "../../../../hooks/useStartListening";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import { useTitleGeneration } from "../../../../hooks/useTitleGeneration";
import * as main from "../../../../store/tinybase/store/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { CaretPositionProvider } from "./caret-position-context";
import { FloatingActionButton } from "./floating";
import { NoteInput } from "./note-input";
import { SearchBar } from "./note-input/transcript/search-bar";
import {
  SearchProvider,
  useTranscriptSearch,
} from "./note-input/transcript/search-context";
import { OuterHeader } from "./outer-header";
import { useCurrentNoteTab, useHasTranscript } from "./shared";
import { TitleInput } from "./title-input";

const SIDEBAR_WIDTH = 280;
const LAYOUT_PADDING = 4;

export const TabItemNote: TabItem<Extract<Tab, { type: "sessions" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
  pendingCloseConfirmationTab,
  setPendingCloseConfirmationTab,
}) => {
  const title = main.UI.useCell("sessions", tab.id, "title", main.STORE_ID);
  const sessionMode = useListener((state) => state.getSessionMode(tab.id));
  const stop = useListener((state) => state.stop);
  const isEnhancing = useIsSessionEnhancing(tab.id);
  const isActive = sessionMode === "active" || sessionMode === "finalizing";
  const isFinalizing = sessionMode === "finalizing";
  const isBatching = sessionMode === "running_batch";
  const showSpinner =
    !tab.active && (isFinalizing || isEnhancing || isBatching);

  const showCloseConfirmation =
    pendingCloseConfirmationTab?.type === "sessions" &&
    pendingCloseConfirmationTab?.id === tab.id;

  const handleCloseConfirmationChange = (show: boolean) => {
    if (!show) {
      setPendingCloseConfirmationTab?.(null);
    }
  };

  const handleCloseWithStop = useCallback(() => {
    if (isActive) {
      stop();
    }
    handleCloseThis(tab);
  }, [isActive, stop, tab, handleCloseThis]);

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title || "Untitled"}
      selected={tab.active}
      active={isActive}
      accent={isActive ? "red" : "neutral"}
      finalizing={showSpinner}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      showCloseConfirmation={showCloseConfirmation}
      onCloseConfirmationChange={handleCloseConfirmationChange}
      handleCloseThis={handleCloseWithStop}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentNote({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const listenerStatus = useListener((state) => state.live.status);
  const sessionMode = useListener((state) => state.getSessionMode(tab.id));
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const { conn } = useSTTConnection();
  const startListening = useStartListening(tab.id);
  const hasAttemptedAutoStart = useRef(false);

  useEffect(() => {
    if (
      sessionMode === "running_batch" &&
      tab.state.view?.type !== "transcript"
    ) {
      updateSessionTabState(tab, {
        ...tab.state,
        view: { type: "transcript" },
      });
    }
  }, [sessionMode, tab, updateSessionTabState]);

  useEffect(() => {
    if (!tab.state.autoStart) {
      hasAttemptedAutoStart.current = false;
      return;
    }

    if (hasAttemptedAutoStart.current) {
      return;
    }

    if (listenerStatus !== "inactive") {
      return;
    }

    if (!conn) {
      return;
    }

    hasAttemptedAutoStart.current = true;
    startListening();
    updateSessionTabState(tab, { ...tab.state, autoStart: null });
  }, [
    tab.id,
    tab.state,
    tab.state.autoStart,
    listenerStatus,
    conn,
    startListening,
    updateSessionTabState,
  ]);

  const { data: audioUrl } = useQuery({
    enabled: listenerStatus === "inactive",
    queryKey: ["audio", tab.id, "url"],
    queryFn: () => fsSyncCommands.audioPath(tab.id),
    select: (result) => {
      if (result.status === "error") {
        return null;
      }
      return convertFileSrc(result.data);
    },
  });

  const showTimeline =
    tab.state.view?.type === "transcript" &&
    Boolean(audioUrl) &&
    listenerStatus === "inactive";

  return (
    <CaretPositionProvider>
      <SearchProvider>
        <AudioPlayer.Provider sessionId={tab.id} url={audioUrl ?? ""}>
          <TabContentNoteInner tab={tab} showTimeline={showTimeline} />
        </AudioPlayer.Provider>
      </SearchProvider>
    </CaretPositionProvider>
  );
}

function TabContentNoteInner({
  tab,
  showTimeline,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
  showTimeline: boolean;
}) {
  const search = useTranscriptSearch();
  const showSearchBar = search?.isVisible ?? false;
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const noteInputRef = React.useRef<{
    editor: import("@hypr/tiptap/editor").TiptapEditor | null;
  }>(null);

  const currentView = useCurrentNoteTab(tab);
  const { generateTitle } = useTitleGeneration(tab);
  const hasTranscript = useHasTranscript(tab.id);

  const sessionId = tab.id;
  const { skipReason } = useAutoEnhance(tab);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const prevSessionMode = useRef<string | null>(sessionMode);

  useAutoFocusTitle({ sessionId, titleInputRef });

  useEffect(() => {
    const justStartedListening =
      prevSessionMode.current !== "active" && sessionMode === "active";

    prevSessionMode.current = sessionMode;

    if (justStartedListening) {
      setShowConsentBanner(true);
      const timer = setTimeout(() => {
        setShowConsentBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionMode]);

  const focusTitle = React.useCallback(() => {
    titleInputRef.current?.focus();
  }, []);

  const focusEditor = React.useCallback(() => {
    noteInputRef.current?.editor?.commands.focus();
  }, []);

  return (
    <>
      <StandardTabWrapper
        afterBorder={showTimeline && <AudioPlayer.Timeline />}
        floatingButton={<FloatingActionButton tab={tab} />}
        showTimeline={showTimeline}
      >
        <div className="flex flex-col h-full">
          <div className="pl-2 pr-1">
            {showSearchBar ? (
              <SearchBar />
            ) : (
              <OuterHeader sessionId={tab.id} currentView={currentView} />
            )}
          </div>
          <div className="mt-2 px-3 shrink-0">
            <TitleInput
              ref={titleInputRef}
              tab={tab}
              onNavigateToEditor={focusEditor}
              onGenerateTitle={hasTranscript ? generateTitle : undefined}
            />
          </div>
          <div className="mt-2 px-2 flex-1 min-h-0">
            <NoteInput
              ref={noteInputRef}
              tab={tab}
              onNavigateToTitle={focusTitle}
            />
          </div>
        </div>
      </StandardTabWrapper>
      <StatusBanner
        skipReason={skipReason}
        showConsentBanner={showConsentBanner}
        showTimeline={showTimeline}
      />
    </>
  );
}

function StatusBanner({
  skipReason,
  showConsentBanner,
  showTimeline,
}: {
  skipReason: string | null;
  showConsentBanner: boolean;
  showTimeline: boolean;
}) {
  const { leftsidebar, chat } = useShell();
  const [chatPanelWidth, setChatPanelWidth] = useState(0);

  const isChatPanelOpen = chat.mode === "RightPanelOpen";

  useEffect(() => {
    if (!isChatPanelOpen) {
      setChatPanelWidth(0);
      return;
    }

    const updateChatWidth = () => {
      const panels = document.querySelectorAll("[data-panel-id]");
      const lastPanel = panels[panels.length - 1];
      if (lastPanel) {
        setChatPanelWidth(lastPanel.getBoundingClientRect().width);
      }
    };

    updateChatWidth();
    window.addEventListener("resize", updateChatWidth);

    // Use ResizeObserver on the specific panel instead of MutationObserver on document.body
    // MutationObserver on document.body with subtree:true causes high CPU usage
    const resizeObserver = new ResizeObserver(updateChatWidth);
    const panels = document.querySelectorAll("[data-panel-id]");
    const lastPanel = panels[panels.length - 1];
    if (lastPanel) {
      resizeObserver.observe(lastPanel);
    }

    return () => {
      window.removeEventListener("resize", updateChatWidth);
      resizeObserver.disconnect();
    };
  }, [isChatPanelOpen]);

  const leftOffset = leftsidebar.expanded
    ? (SIDEBAR_WIDTH + LAYOUT_PADDING) / 2
    : 0;
  const rightOffset = chatPanelWidth / 2;
  const totalOffset = leftOffset - rightOffset;

  return createPortal(
    <AnimatePresence>
      {(skipReason || showConsentBanner) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ left: `calc(50% + ${totalOffset}px)` }}
          className={cn([
            "fixed -translate-x-1/2 z-50",
            "whitespace-nowrap text-center text-xs",
            skipReason ? "text-red-400" : "text-stone-300",
            showTimeline ? "bottom-[76px]" : "bottom-6",
          ])}
        >
          {skipReason || "Ask for consent when using Hyprnote"}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function useAutoFocusTitle({
  sessionId,
  titleInputRef,
}: {
  sessionId: string;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  // Prevent re-focusing when the user intentionally leaves the title empty.
  const didAutoFocus = useRef(false);

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  useEffect(() => {
    if (didAutoFocus.current) return;

    if (!title) {
      titleInputRef.current?.focus();
      didAutoFocus.current = true;
    }
  }, [sessionId, title]);
}
