import { PuzzleIcon } from "lucide-react";
import { StandardTabWrapper } from "~/shared/main";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import { type Tab } from "~/store/zustand/tabs";

import { getPluginDisplayName, getPluginView } from "./registry";

type PluginTab = Extract<Tab, { type: "plugin" }>;

export const TabItemPlugin: TabItem<PluginTab> = ({
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
      icon={<PuzzleIcon className="w-4 h-4" />}
      title={getPluginDisplayName(tab.pluginId)}
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

export function TabContentPlugin({ tab }: { tab: PluginTab }) {
  const render = getPluginView(tab.pluginId);

  return (
    <StandardTabWrapper>
      {render?.() ?? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <PuzzleIcon size={48} className="mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500">Plugin not found: {tab.pluginId}</p>
          </div>
        </div>
      )}
    </StandardTabWrapper>
  );
}
