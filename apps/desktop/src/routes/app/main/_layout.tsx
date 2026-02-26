import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef } from "react";
import { AITaskProvider } from "~/ai/contexts";
import { useLanguageModel, useLLMConnection } from "~/ai/hooks";
import { hydrateSessionContextFromFs } from "~/chat/session-context-hydrator";
import { buildChatTools } from "~/chat/tools";
import { NotificationProvider } from "~/contexts/notifications";
import { ShellProvider } from "~/contexts/shell";
import { useRegisterTools } from "~/contexts/tool";
import { ToolRegistryProvider } from "~/contexts/tool";
import { useDeeplinkHandler } from "~/shared/hooks/useDeeplinkHandler";
import { useSearchEngine } from "~/search/contexts/engine";
import { SearchEngineProvider } from "~/search/contexts/engine";
import { SearchUIProvider } from "~/search/contexts/ui";
import { initEnhancerService } from "~/services/enhancer";
import { deleteSessionCascade } from "~/store/tinybase/store/deleteSession";
import * as main from "~/store/tinybase/store/main";
import { isSessionEmpty } from "~/store/tinybase/store/sessions";
import * as settings from "~/store/tinybase/store/settings";
import { listenerStore } from "~/store/zustand/listener/instance";
import {
  restorePinnedTabsToStore,
  restoreRecentlyOpenedToStore,
  useTabs,
} from "~/store/zustand/tabs";
import { commands } from "~/types/tauri.gen";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, aiTaskStore, toolRegistry } = useRouteContext({
    from: "__root__",
  });
  const {
    registerOnEmpty,
    registerCanClose,
    registerOnClose,
    openNew,
    pin,
    invalidateResource,
  } = useTabs();
  const hasOpenedInitialTab = useRef(false);
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  useDeeplinkHandler();

  const openDefaultEmptyTab = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  useEffect(() => {
    const initializeTabs = async () => {
      if (!hasOpenedInitialTab.current) {
        hasOpenedInitialTab.current = true;
        if (!isTauri()) {
          openDefaultEmptyTab();
          return;
        }
        await restorePinnedTabsToStore(
          openNew,
          pin,
          () => useTabs.getState().tabs,
        );
        await restoreRecentlyOpenedToStore((ids) => {
          useTabs.setState({ recentlyOpenedSessionIds: ids });
        });
        const currentTabs = useTabs.getState().tabs;
        if (currentTabs.length === 0) {
          const result = await commands.getOnboardingNeeded();
          if (result.status === "ok" && result.data) {
            openNew({ type: "onboarding" });
          } else {
            openDefaultEmptyTab();
          }
        }
      }
    };

    initializeTabs();
    registerOnEmpty(openDefaultEmptyTab);
  }, [openNew, pin, openDefaultEmptyTab, registerOnEmpty]);

  useEffect(() => {
    registerCanClose(() => true);
  }, [registerCanClose]);

  useEffect(() => {
    if (!store) {
      return;
    }
    registerOnClose((tab) => {
      if (tab.type === "sessions") {
        const sessionId = tab.id;
        const isBatchRunning =
          listenerStore.getState().getSessionMode(sessionId) ===
          "running_batch";
        if (!isBatchRunning && isSessionEmpty(store, sessionId)) {
          invalidateResource("sessions", sessionId);
          void deleteSessionCascade(store, indexes, sessionId);
        }
      }
    });
  }, [registerOnClose, invalidateResource, store, indexes]);

  if (!aiTaskStore) {
    return null;
  }

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <ShellProvider>
          <ToolRegistryProvider registry={toolRegistry}>
            <AITaskProvider store={aiTaskStore}>
              <NotificationProvider>
                <ToolRegistration />
                <EnhancerInit />
                <Outlet />
              </NotificationProvider>
            </AITaskProvider>
          </ToolRegistryProvider>
        </ShellProvider>
      </SearchUIProvider>
    </SearchEngineProvider>
  );
}

function ToolRegistration() {
  const { search } = useSearchEngine();
  const store = main.UI.useStore(main.STORE_ID);

  useRegisterTools(
    "chat-general",
    () =>
      buildChatTools({
        search,
        resolveSessionContext: (sessionId) =>
          hydrateSessionContextFromFs(store, sessionId),
      }),
    [search, store],
  );

  return null;
}

function EnhancerInit() {
  const { persistedStore, aiTaskStore } = useRouteContext({
    from: "__root__",
  });

  const model = useLanguageModel("enhance");
  const { conn: llmConn } = useLLMConnection();
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const selectedTemplateId = settings.UI.useValue(
    "selected_template_id",
    settings.STORE_ID,
  ) as string | undefined;

  const modelRef = useRef(model);
  modelRef.current = model;
  const llmConnRef = useRef(llmConn);
  llmConnRef.current = llmConn;
  const templateIdRef = useRef(selectedTemplateId);
  templateIdRef.current = selectedTemplateId;

  useEffect(() => {
    if (!persistedStore || !aiTaskStore || !indexes) return;

    const service = initEnhancerService({
      mainStore: persistedStore,
      indexes,
      aiTaskStore,
      getModel: () => modelRef.current,
      getLLMConn: () => llmConnRef.current,
      getSelectedTemplateId: () => templateIdRef.current || undefined,
    });

    return () => service.dispose();
  }, [persistedStore, aiTaskStore, indexes]);

  return null;
}
