import { useMemo } from "react";

import {
  getBaseLanguageDisplayName,
  parseLocale,
} from "../../../utils/language";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./searchable-select";

export function MainLanguageView({
  value,
  onChange,
  supportedLanguages,
}: {
  value: string;
  onChange: (value: string) => void;
  supportedLanguages: readonly string[];
}) {
  const deduped = useMemo(() => {
    const map = new Map<string, string>();
    for (const code of supportedLanguages) {
      const { language } = parseLocale(code);
      if (!map.has(language)) {
        map.set(language, code);
      }
    }
    return map;
  }, [supportedLanguages]);

  const normalizedValue = useMemo(() => {
    const { language } = parseLocale(value);
    return deduped.get(language) ?? value;
  }, [value, deduped]);

  const options: SearchableSelectOption[] = useMemo(
    () =>
      [...deduped.values()].map((code) => ({
        value: code,
        label: getBaseLanguageDisplayName(code),
      })),
    [deduped],
  );

  return (
    <div
      data-settings-item
      className="flex flex-row items-center justify-between"
    >
      <div>
        <h3 className="text-sm font-medium mb-1">Main language</h3>
        <p className="text-xs text-neutral-600">
          Language for summaries, chats, and AI-generated responses
        </p>
      </div>
      <SearchableSelect
        value={normalizedValue}
        onChange={onChange}
        options={options}
        placeholder="Select language"
        searchPlaceholder="Search language..."
        className="w-40"
      />
    </div>
  );
}
