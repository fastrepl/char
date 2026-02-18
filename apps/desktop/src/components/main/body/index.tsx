import { useQuery } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PanelLeftOpenIcon,
  PlusIcon,
} from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "usehooks-ts";
import { useShallow } from "zustand/shallow";

import { commands as flagCommands } from "@hypr/plugin-flag";
import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useListener } from "../../../contexts/listener";
import { useNotifications } from "../../../contexts/notifications";
import { useShell } from "../../../contexts/shell";
import { useNativeContextMenu } from "../../../hooks/useNativeContextMenu";
import {
  type Tab,
  uniqueIdfromTab,
  useTabs,
} from "../../../store/zustand/tabs";
import { ChatFloatingButton } from "../../chat";
import { NotificationBadge } from "../../ui/notification-badge";
import { TrafficLights } from "../../window/traffic-lights";
import { useNewNote, useNewNoteAndListen } from "../shared";
import { TabContentSearch, TabItemSearch } from "./advanced-search";
import { TabContentAI, TabItemAI } from "./ai";
import { TabContentCalendar, TabItemCalendar } from "./calendar";
import { TabContentChangelog, TabItemChangelog } from "./changelog";
import { TabContentChat, TabItemChat } from "./chat";
import { TabContentChatShortcut, TabItemChatShortcut } from "./chat-shortcuts";
import { TabContentContact, TabItemContact } from "./contacts";
import { TabContentEmpty, TabItemEmpty } from "./empty";
import {
  TabContentExtension,
  TabContentExtensions,
  TabItemExtension,
  TabItemExtensions,
} from "./extensions";
import { loadExtensionPanels } from "./extensions/registry";
import { TabContentFolder, TabItemFolder } from "./folders";
import { TabContentHuman, TabItemHuman } from "./humans";
import { TabContentOnboarding, TabItemOnboarding } from "./onboarding";
import { Search } from "./search";
import { TabContentNote, TabItemNote } from "./sessions";
import { useCaretPosition } from "./sessions/caret-position-context";
import { TabContentSettings, TabItemSettings } from "./settings";
import { TabContentTemplate, TabItemTemplate } from "./templates";
import { Update } from "./update";

export function Body() {
  const { tabs, currentTab } = useTabs(
    useShallow((state) => ({
      tabs: state.tabs,
      currentTab: state.currentTab,
    })),
  );

  useEffect(() => {
    void loadExtensionPanels();
  }, []);

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 h-full flex-1 relative">
      <Header tabs={tabs} />
      <div className="flex-1 overflow-auto">
        <ContentWrapper key={uniqueIdfromTab(currentTab)} tab={currentTab} />
      </div>
    </div>
  );
}

function Header({ tabs }: { tabs: Tab[] }) {
  const { leftsidebar } = useShell();
  const isLinux = platform() === "linux";
  const notifications = useNotifications();
  const currentTab = useTabs((state) => state.currentTab);
  const isOnboarding = currentTab?.type === "onboarding";
  const isSidebarHidden = isOnboarding || !leftsidebar.expanded;
  const {
    select,
    close,
    reorder,
    goBack,
    goNext,
    canGoBack,
    canGoNext,
    closeOthers,
    closeAll,
    pin,
    unpin,
    pendingCloseConfirmationTab,
    setPendingCloseConfirmationTab,
  } = useTabs(
    useShallow((state) => ({
      select: state.select,
      close: state.close,
      reorder: state.reorder,
      goBack: state.goBack,
      goNext: state.goNext,
      canGoBack: state.canGoBack,
      canGoNext: state.canGoNext,
      closeOthers: state.closeOthers,
      closeAll: state.closeAll,
      pin: state.pin,
      unpin: state.unpin,
      pendingCloseConfirmationTab: state.pendingCloseConfirmationTab,
      setPendingCloseConfirmationTab: state.setPendingCloseConfirmationTab,
    })),
  );

  const liveSessionId = useListener((state) => state.live.sessionId);
  const liveStatus = useListener((state) => state.live.status);
  const isListening = liveStatus === "active" || liveStatus === "finalizing";

  const listeningTab = useMemo(
    () =>
      isListening && liveSessionId
        ? tabs.find((t) => t.type === "sessions" && t.id === liveSessionId)
        : null,
    [isListening, liveSessionId, tabs],
  );
  const regularTabs = useMemo(
    () =>
      listeningTab
        ? tabs.filter((t) => !(t.type === "sessions" && t.id === liveSessionId))
        : tabs,
    [listeningTab, tabs, liveSessionId],
  );

  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);
  const handleNewEmptyTab = useNewEmptyTab();
  const handleNewNote = useNewNote({ behavior: "new" });
  const handleNewNoteAndListen = useNewNoteAndListen();
  const showNewTabMenu = useNativeContextMenu([
    { id: "empty-tab", text: "Open Empty Tab", action: handleNewEmptyTab },
    { id: "new-note", text: "Create New Note", action: handleNewNote },
    {
      id: "new-note-listen",
      text: "Create and Start Listening",
      action: handleNewNoteAndListen,
    },
  ]);
  const [isSearchManuallyExpanded, setIsSearchManuallyExpanded] =
    useState(false);
  const scrollState = useScrollState(
    tabsScrollContainerRef,
    regularTabs.length,
  );

  const setTabRef = useScrollActiveTabIntoView(regularTabs);
  return (
    <div
      data-tauri-drag-region
      className={cn([
        "w-full h-9 flex items-center",
        isSidebarHidden && (isLinux ? "pl-3" : "pl-20"),
      ])}
    >
      {isSidebarHidden && isLinux && <TrafficLights className="mr-2" />}
      {!leftsidebar.expanded && !isOnboarding && (
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={() => leftsidebar.setExpanded(true)}
              >
                <PanelLeftOpenIcon size={16} className="text-neutral-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>Toggle sidebar</span>
              <Kbd className="animate-kbd-press">⌘ \</Kbd>
            </TooltipContent>
          </Tooltip>
          <NotificationBadge show={notifications.shouldShowBadge} />
        </div>
      )}

      {!isOnboarding && (
        <div className="flex items-center h-full shrink-0">
          <Button
            onClick={goBack}
            disabled={!canGoBack}
            variant="ghost"
            size="icon"
          >
            <ArrowLeftIcon size={16} />
          </Button>
          <Button
            onClick={goNext}
            disabled={!canGoNext}
            variant="ghost"
            size="icon"
          >
            <ArrowRightIcon size={16} />
          </Button>
        </div>
      )}

      {listeningTab && (
        <div className="flex items-center h-full shrink-0 mr-1">
          <TabItem
            tab={listeningTab}
            handleClose={close}
            handleSelect={select}
            handleCloseOthersCallback={closeOthers}
            handleCloseAll={closeAll}
            handlePin={pin}
            handleUnpin={unpin}
            tabIndex={1}
            pendingCloseConfirmationTab={pendingCloseConfirmationTab}
            setPendingCloseConfirmationTab={setPendingCloseConfirmationTab}
          />
        </div>
      )}

      <div className="relative h-full min-w-0">
        <div
          ref={tabsScrollContainerRef}
          data-tauri-drag-region
          className={cn([
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            "w-full overflow-x-auto overflow-y-hidden h-full",
          ])}
        >
          <Reorder.Group
            key={leftsidebar.expanded ? "expanded" : "collapsed"}
            as="div"
            axis="x"
            values={regularTabs}
            onReorder={reorder}
            className="flex w-max gap-1 h-full"
          >
            {regularTabs.map((tab, index) => {
              const isLastTab = index === regularTabs.length - 1;
              const shortcutIndex = listeningTab
                ? index < 7
                  ? index + 2
                  : isLastTab
                    ? 9
                    : undefined
                : index < 8
                  ? index + 1
                  : isLastTab
                    ? 9
                    : undefined;

              return (
                <Reorder.Item
                  key={uniqueIdfromTab(tab)}
                  value={tab}
                  as="div"
                  ref={(el) => setTabRef(tab, el)}
                  style={{ position: "relative" }}
                  className="h-full z-10"
                  layoutScroll
                >
                  <TabItem
                    tab={tab}
                    handleClose={close}
                    handleSelect={select}
                    handleCloseOthersCallback={closeOthers}
                    handleCloseAll={closeAll}
                    handlePin={pin}
                    handleUnpin={unpin}
                    tabIndex={shortcutIndex}
                    pendingCloseConfirmationTab={pendingCloseConfirmationTab}
                    setPendingCloseConfirmationTab={
                      setPendingCloseConfirmationTab
                    }
                  />
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
        {!scrollState.atStart && (
          <div className="absolute left-0 top-0 h-full w-8 z-20 pointer-events-none bg-linear-to-r from-white to-transparent" />
        )}
        {!scrollState.atEnd && (
          <div className="absolute right-0 top-0 h-full w-8 z-20 pointer-events-none bg-linear-to-l from-white to-transparent" />
        )}
      </div>

      <div
        data-tauri-drag-region
        className="flex-1 flex h-full items-center justify-between"
      >
        {!isSearchManuallyExpanded && (
          <Button
            onClick={isOnboarding ? undefined : handleNewEmptyTab}
            onContextMenu={isOnboarding ? undefined : showNewTabMenu}
            disabled={isOnboarding}
            variant="ghost"
            size="icon"
            className={cn([
              "text-neutral-600",
              isOnboarding && "opacity-40 cursor-not-allowed",
            ])}
          >
            <PlusIcon size={16} />
          </Button>
        )}

        <div className="flex items-center gap-1 h-full ml-auto">
          <Update />
          {!isOnboarding && (
            <Search onManualExpandChange={setIsSearchManuallyExpanded} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabItem({
  tab,
  handleClose,
  handleSelect,
  handleCloseOthersCallback,
  handleCloseAll,
  handlePin,
  handleUnpin,
  tabIndex,
  pendingCloseConfirmationTab,
  setPendingCloseConfirmationTab,
}: {
  tab: Tab;
  handleClose: (tab: Tab) => void;
  handleSelect: (tab: Tab) => void;
  handleCloseOthersCallback: (tab: Tab) => void;
  handleCloseAll: () => void;
  handlePin: (tab: Tab) => void;
  handleUnpin: (tab: Tab) => void;
  tabIndex?: number;
  pendingCloseConfirmationTab?: Tab | null;
  setPendingCloseConfirmationTab?: (tab: Tab | null) => void;
}) {
  const handleCloseOthers = () => handleCloseOthersCallback(tab);
  const handlePinThis = () => handlePin(tab);
  const handleUnpinThis = () => handleUnpin(tab);

  if (tab.type === "sessions") {
    return (
      <TabItemNote
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
        pendingCloseConfirmationTab={pendingCloseConfirmationTab}
        setPendingCloseConfirmationTab={setPendingCloseConfirmationTab}
      />
    );
  }
  if (tab.type === "folders") {
    return (
      <TabItemFolder
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "humans") {
    return (
      <TabItemHuman
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "contacts") {
    return (
      <TabItemContact
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }

  if (tab.type === "empty") {
    return (
      <TabItemEmpty
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "calendar") {
    return (
      <TabItemCalendar
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "extension") {
    return (
      <TabItemExtension
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "extensions") {
    return (
      <TabItemExtensions
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "changelog") {
    return (
      <TabItemChangelog
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "settings") {
    return (
      <TabItemSettings
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "ai") {
    return (
      <TabItemAI
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "templates") {
    return (
      <TabItemTemplate
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "chat_shortcuts") {
    return (
      <TabItemChatShortcut
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "search") {
    return (
      <TabItemSearch
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "chat_support") {
    return (
      <TabItemChat
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  if (tab.type === "onboarding") {
    return (
      <TabItemOnboarding
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={handlePinThis}
        handleUnpinThis={handleUnpinThis}
      />
    );
  }
  return null;
}

function ContentWrapper({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }
  if (tab.type === "folders") {
    return <TabContentFolder tab={tab} />;
  }
  if (tab.type === "humans") {
    return <TabContentHuman tab={tab} />;
  }
  if (tab.type === "contacts") {
    return <TabContentContact tab={tab} />;
  }

  if (tab.type === "empty") {
    return <TabContentEmpty tab={tab} />;
  }
  if (tab.type === "calendar") {
    return <TabContentCalendar />;
  }
  if (tab.type === "extension") {
    return <TabContentExtension tab={tab} />;
  }
  if (tab.type === "extensions") {
    return <TabContentExtensions tab={tab} />;
  }
  if (tab.type === "changelog") {
    return <TabContentChangelog tab={tab} />;
  }
  if (tab.type === "settings") {
    return <TabContentSettings tab={tab} />;
  }
  if (tab.type === "ai") {
    return <TabContentAI tab={tab} />;
  }
  if (tab.type === "templates") {
    return <TabContentTemplate tab={tab} />;
  }
  if (tab.type === "chat_shortcuts") {
    return <TabContentChatShortcut tab={tab} />;
  }
  if (tab.type === "search") {
    return <TabContentSearch tab={tab} />;
  }
  if (tab.type === "chat_support") {
    return <TabContentChat tab={tab} />;
  }
  if (tab.type === "onboarding") {
    return <TabContentOnboarding tab={tab} />;
  }
  return null;
}

function TabChatButton({
  isCaretNearBottom = false,
  showTimeline = false,
}: {
  isCaretNearBottom?: boolean;
  showTimeline?: boolean;
}) {
  const { chat } = useShell();
  const currentTab = useTabs((state) => state.currentTab);

  const { data: isChatEnabled } = useQuery({
    refetchInterval: 10_000,
    queryKey: ["flag", "chat"],
    queryFn: async () => {
      const result = await flagCommands.isEnabled("chat");
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  if (!isChatEnabled) {
    return null;
  }

  if (chat.mode === "RightPanelOpen" || chat.mode === "FullTab") {
    return null;
  }

  if (
    currentTab?.type === "ai" ||
    currentTab?.type === "settings" ||
    currentTab?.type === "chat_support" ||
    currentTab?.type === "onboarding"
  ) {
    return null;
  }

  return (
    <ChatFloatingButton
      isCaretNearBottom={isCaretNearBottom}
      showTimeline={showTimeline}
    />
  );
}

export function StandardTabWrapper({
  children,
  afterBorder,
  floatingButton,
  showTimeline = false,
}: {
  children: React.ReactNode;
  afterBorder?: React.ReactNode;
  floatingButton?: React.ReactNode;
  showTimeline?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col rounded-xl border border-neutral-200 flex-1 overflow-hidden relative">
        {children}
        {floatingButton}
        <StandardTabChatButton showTimeline={showTimeline} />
      </div>
      {afterBorder && <div className="mt-1">{afterBorder}</div>}
    </div>
  );
}

function StandardTabChatButton({
  showTimeline = false,
}: {
  showTimeline?: boolean;
}) {
  const caretPosition = useCaretPosition();
  const isCaretNearBottom = caretPosition?.isCaretNearBottom ?? false;

  return (
    <TabChatButton
      isCaretNearBottom={isCaretNearBottom}
      showTimeline={showTimeline}
    />
  );
}

function useScrollState(
  ref: React.RefObject<HTMLDivElement | null>,
  tabCount: number,
) {
  const [scrollState, setScrollState] = useState({
    atStart: true,
    atEnd: true,
  });

  const updateScrollState = useCallback(() => {
    const container = ref.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const hasOverflow = scrollWidth > clientWidth + 1;
    const newState = {
      atStart: !hasOverflow || scrollLeft <= 1,
      atEnd: !hasOverflow || scrollLeft + clientWidth >= scrollWidth - 1,
    };
    setScrollState((prev) => {
      if (prev.atStart === newState.atStart && prev.atEnd === newState.atEnd) {
        return prev;
      }
      return newState;
    });
  }, [ref]);

  useResizeObserver({
    ref: ref as React.RefObject<HTMLDivElement>,
    onResize: updateScrollState,
  });

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    updateScrollState();
    requestAnimationFrame(updateScrollState);
    container.addEventListener("scroll", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, tabCount]);

  return scrollState;
}

function useScrollActiveTabIntoView(tabs: Tab[]) {
  const tabRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const activeTab = tabs.find((tab) => tab.active);
  const activeTabKey = activeTab ? uniqueIdfromTab(activeTab) : null;

  useEffect(() => {
    if (activeTabKey) {
      const tabElement = tabRefsMap.current.get(activeTabKey);
      if (tabElement) {
        tabElement.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: "nearest",
        });
      }
    }
  }, [activeTabKey]);

  const setTabRef = useCallback((tab: Tab, el: HTMLDivElement | null) => {
    if (el) {
      tabRefsMap.current.set(uniqueIdfromTab(tab), el);
    } else {
      tabRefsMap.current.delete(uniqueIdfromTab(tab));
    }
  }, []);

  return setTabRef;
}

function useNewEmptyTab() {
  const openNew = useTabs((state) => state.openNew);

  const handler = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  return handler;
}
