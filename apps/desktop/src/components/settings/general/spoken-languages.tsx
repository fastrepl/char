import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { getLanguageDisplayName } from "../../../utils/language";

function hasRegionVariant(langCode: string): boolean {
  return langCode.includes("-");
}

function getBaseLanguage(langCode: string): string {
  return langCode.split("-")[0];
}

function isLanguageDisabled(
  langCode: string,
  selectedLanguages: string[],
): boolean {
  const base = getBaseLanguage(langCode);
  const isVariant = hasRegionVariant(langCode);

  for (const selected of selectedLanguages) {
    const selectedBase = getBaseLanguage(selected);
    if (selectedBase !== base) continue;

    if (isVariant) {
      return selected === base || hasRegionVariant(selected);
    } else {
      return hasRegionVariant(selected);
    }
  }
  return false;
}

interface SpokenLanguagesViewProps {
  value: string[];
  onChange: (value: string[]) => void;
  supportedLanguages: readonly string[];
}

export function SpokenLanguagesView({
  value,
  onChange,
  supportedLanguages,
}: SpokenLanguagesViewProps) {
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [languageInputFocused, setLanguageInputFocused] = useState(false);
  const [languageSelectedIndex, setLanguageSelectedIndex] = useState(-1);

  const filteredLanguages = useMemo(() => {
    if (!languageSearchQuery.trim()) {
      return [];
    }
    const query = languageSearchQuery.toLowerCase();
    return supportedLanguages.filter((langCode) => {
      if (value.includes(langCode)) return false;
      if (isLanguageDisabled(langCode, value)) return false;
      const langName = getLanguageDisplayName(langCode);
      return langName.toLowerCase().includes(query);
    });
  }, [languageSearchQuery, value, supportedLanguages]);

  const handleLanguageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !languageSearchQuery && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
      return;
    }

    if (!languageSearchQuery.trim() || filteredLanguages.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLanguageSelectedIndex((prev) =>
        prev < filteredLanguages.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLanguageSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        languageSelectedIndex >= 0 &&
        languageSelectedIndex < filteredLanguages.length
      ) {
        const selectedCode = filteredLanguages[languageSelectedIndex];
        onChange([...value, selectedCode]);
        setLanguageSearchQuery("");
        setLanguageSelectedIndex(-1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setLanguageInputFocused(false);
      setLanguageSearchQuery("");
    }
  };

  return (
    <div data-settings-item>
      <h3 className="text-sm font-medium mb-1">Spoken languages</h3>
      <p className="text-xs text-neutral-600 mb-3">
        Add other languages you use other than the main language
      </p>
      <div className="relative">
        <div
          className={cn([
            "flex flex-wrap items-center w-full px-2 py-1.5 gap-1.5 rounded-lg bg-white border border-neutral-200 focus-within:border-neutral-300 min-h-[38px]",
            languageInputFocused && "border-neutral-300",
          ])}
          onClick={() =>
            document.getElementById("language-search-input")?.focus()
          }
        >
          {value.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
            >
              {getLanguageDisplayName(code)}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((c) => c !== code));
                }}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          ))}
          {value.length === 0 && (
            <Search className="size-4 text-neutral-700 shrink-0" />
          )}
          <input
            id="language-search-input"
            type="text"
            value={languageSearchQuery}
            onChange={(e) => {
              setLanguageSearchQuery(e.target.value);
              setLanguageSelectedIndex(-1);
            }}
            onKeyDown={handleLanguageKeyDown}
            onFocus={() => setLanguageInputFocused(true)}
            onBlur={() => setLanguageInputFocused(false)}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={languageInputFocused && !!languageSearchQuery.trim()}
            aria-controls="language-options"
            aria-activedescendant={
              languageSelectedIndex >= 0
                ? `language-option-${languageSelectedIndex}`
                : undefined
            }
            aria-label="Add spoken language"
            placeholder={value.length === 0 ? "Add language" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-hidden placeholder:text-neutral-500"
          />
        </div>

        {languageInputFocused && languageSearchQuery.trim() && (
          <div
            id="language-options"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1 flex flex-col w-full rounded-xs border border-neutral-200 overflow-hidden bg-white shadow-md z-10 max-h-60 overflow-y-auto"
          >
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((langCode, index) => (
                <button
                  key={langCode}
                  id={`language-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={languageSelectedIndex === index}
                  onClick={() => {
                    onChange([...value, langCode]);
                    setLanguageSearchQuery("");
                    setLanguageSelectedIndex(-1);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setLanguageSelectedIndex(index)}
                  className={cn([
                    "flex items-center justify-between px-3 py-2 text-sm text-left transition-colors w-full",
                    languageSelectedIndex === index
                      ? "bg-neutral-200"
                      : "hover:bg-neutral-100",
                  ])}
                >
                  <span className="font-medium truncate">
                    {getLanguageDisplayName(langCode)}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                No matching languages found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
