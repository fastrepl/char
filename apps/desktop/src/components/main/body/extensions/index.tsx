import { BlocksIcon, PuzzleIcon } from "lucide-react";
import { useCallback } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { ExtensionDetailsColumn } from "./details";
import { ExtensionsListColumn } from "./list";

type ExtensionTab = Extract<Tab, { type: "extension" }>;
type ExtensionsTab = Extract<Tab, { type: "extensions" }>;

export const TabItemExtensions: TabItem<ExtensionsTab> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<BlocksIcon className="w-4 h-4" />}
      title={"Extensions"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentExtensions({ tab }: { tab: ExtensionsTab }) {
  return (
    <StandardTabWrapper>
      <ExtensionsView tab={tab} />
    </StandardTabWrapper>
  );
}

function ExtensionsView({ tab }: { tab: ExtensionsTab }) {
  const updateExtensionsTabState = useTabs(
    (state) => state.updateExtensionsTabState,
  );

  const { selectedExtension } = tab.state;

  const setSelectedExtension = useCallback(
    (value: string | null) => {
      updateExtensionsTabState(tab, {
        ...tab.state,
        selectedExtension: value,
      });
    },
    [updateExtensionsTabState, tab],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <ExtensionsListColumn
          selectedExtension={selectedExtension}
          setSelectedExtension={setSelectedExtension}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={50}>
        <ExtensionDetailsColumn selectedExtensionId={selectedExtension} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function TabItemExtension({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}: {
  tab: ExtensionTab;
  tabIndex?: number;
  handleCloseThis: (tab: Tab) => void;
  handleSelectThis: (tab: Tab) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
  handlePinThis: () => void;
  handleUnpinThis: () => void;
}) {
  return (
    <TabItemBase
      icon={<PuzzleIcon className="w-4 h-4" />}
      title={tab.extensionId}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={handlePinThis}
      handleUnpinThis={handleUnpinThis}
    />
  );
}

export function TabContentExtension({ tab }: { tab: ExtensionTab }) {
  return (
    <StandardTabWrapper>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <PuzzleIcon size={48} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500">Extension: {tab.extensionId}</p>
        </div>
      </div>
    </StandardTabWrapper>
  );
}
