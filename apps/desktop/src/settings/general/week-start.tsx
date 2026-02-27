import { useMemo } from "react";
import { useConfigValue } from "~/shared/config";
import * as settings from "~/store/tinybase/store/settings";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./searchable-select";

function getSystemWeekStart(): "sunday" | "monday" {
  const locale = navigator.language || "en-US";
  try {
    const options = new Intl.Locale(locale);
    const info = (options as any).getWeekInfo?.() ?? (options as any).weekInfo;
    if (info?.firstDay === 1) return "monday";
  } catch {}
  return "sunday";
}

export function WeekStartSelector() {
  const value = useConfigValue("week_start");
  const setWeekStart = settings.UI.useSetValueCallback(
    "week_start",
    (val: string) => val,
    [],
    settings.STORE_ID,
  );

  const systemDefault = useMemo(() => getSystemWeekStart(), []);

  const options: SearchableSelectOption[] = useMemo(
    () => [
      { value: "sunday", label: "Sunday" },
      { value: "monday", label: "Monday" },
    ],
    [],
  );

  const displayValue = value || systemDefault;

  const handleChange = (val: string) => {
    setWeekStart(val === systemDefault ? "" : val);
  };

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Week starts on</h3>
        <p className="text-xs text-neutral-600">
          First day of the week in the calendar view
        </p>
      </div>
      <SearchableSelect
        value={displayValue}
        onChange={handleChange}
        options={options}
        placeholder="Select day"
        className="w-40"
      />
    </div>
  );
}
