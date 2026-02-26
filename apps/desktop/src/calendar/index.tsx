import { CalendarDays } from "lucide-react";
import { StandardTabWrapper } from "~/shared/main";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import { type Tab } from "~/store/zustand/tabs";

import { CalendarView } from "./components/calendar-view";

export const TabItemCalendar: TabItem<Extract<Tab, { type: "calendar" }>> = ({
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
      icon={<CalendarDays className="w-4 h-4" />}
      title={"Calendar"}
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

export function TabContentCalendar() {
  return (
    <StandardTabWrapper>
      <CalendarView />
    </StandardTabWrapper>
  );
}
