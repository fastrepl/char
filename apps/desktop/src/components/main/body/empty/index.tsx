import { AppWindowIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Kbd } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";

import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { useNewNote } from "../../shared";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { OpenNoteDialog } from "./open-note-dialog";

export const TabItemEmpty: TabItem<Extract<Tab, { type: "empty" }>> = ({
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
      icon={<AppWindowIcon className="w-4 h-4" />}
      title="New tab"
      selected={tab.active}
      allowPin={false}
      isEmptyTab
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

export function TabContentEmpty({
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "empty" }>;
}) {
  return (
    <StandardTabWrapper>
      <EmptyView />
    </StandardTabWrapper>
  );
}

function EmptyView() {
  const newNote = useNewNote({ behavior: "current" });
  const openCurrent = useTabs((state) => state.openCurrent);
  const [openNoteDialogOpen, setOpenNoteDialogOpen] = useState(false);

  const openCalendar = useCallback(
    () => openCurrent({ type: "calendar" }),
    [openCurrent],
  );
  const openContacts = useCallback(
    () => openCurrent({ type: "contacts" }),
    [openCurrent],
  );
  const openSettings = useCallback(
    () => openCurrent({ type: "settings" }),
    [openCurrent],
  );
  const openAiSettings = useCallback(
    () => openCurrent({ type: "ai" }),
    [openCurrent],
  );
  const openAdvancedSearch = useCallback(
    () => openCurrent({ type: "search" }),
    [openCurrent],
  );

  useHotkeys(
    "mod+o",
    () => setOpenNoteDialogOpen(true),
    { preventDefault: true, enableOnFormTags: true },
    [setOpenNoteDialogOpen],
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 mb-12 text-neutral-600">
      <div className="flex flex-col gap-1 text-center min-w-[280px]">
        <ActionItem label="New Note" shortcut={["⌘", "N"]} onClick={newNote} />
        <ActionItem
          label="Open Note"
          shortcut={["⌘", "O"]}
          onClick={() => setOpenNoteDialogOpen(true)}
        />
        <div className="h-px bg-neutral-200 my-1" />
        <ActionItem
          label="Contacts"
          shortcut={["⌘", "⇧", "O"]}
          onClick={openContacts}
        />
        <ActionItem
          label="Calendar"
          shortcut={["⌘", "⇧", "C"]}
          onClick={openCalendar}
        />
        <ActionItem
          label="Advanced Search"
          shortcut={["⌘", "⇧", "F"]}
          onClick={openAdvancedSearch}
        />
        <div className="h-px bg-neutral-200 my-1" />
        <ActionItem
          label="AI Settings"
          shortcut={["⌘", "⇧", ","]}
          onClick={openAiSettings}
        />
        <ActionItem
          label="App Settings"
          shortcut={["⌘", ","]}
          onClick={openSettings}
        />
      </div>
      <OpenNoteDialog
        open={openNoteDialogOpen}
        onOpenChange={setOpenNoteDialogOpen}
      />
    </div>
  );
}

function ActionItem({
  label,
  shortcut,
  icon,
  onClick,
}: {
  label: string;
  shortcut?: string[];
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "group",
        "flex items-center justify-between gap-8",
        "text-sm",
        "rounded-md px-4 py-2",
        "hover:bg-neutral-100 transition-colors cursor-pointer",
      ])}
    >
      <span>{label}</span>
      {shortcut && shortcut.length > 0 ? (
        <Kbd
          className={cn([
            "transition-all duration-100",
            "group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
            "group-active:translate-y-0.5 group-active:shadow-none",
          ])}
        >
          {shortcut.join(" ")}
        </Kbd>
      ) : (
        icon
      )}
    </button>
  );
}
