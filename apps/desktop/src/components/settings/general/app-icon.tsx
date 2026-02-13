import { cn } from "@hypr/utils";

import nightlyIcon from "../../../assets/icons/nightly.png";
import proIcon from "../../../assets/icons/pro.png";
import stableIcon from "../../../assets/icons/stable.png";
import stagingIcon from "../../../assets/icons/staging.png";

const ICON_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: "stable", label: "Stable", icon: stableIcon },
  { value: "nightly", label: "Nightly", icon: nightlyIcon },
  { value: "staging", label: "Staging", icon: stagingIcon },
  { value: "pro", label: "Pro", icon: proIcon },
];

interface AppIconSettingsProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function AppIconSettings({ value, onChange }: AppIconSettingsProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold font-serif mb-4">App Icon</h2>
      <div className="grid grid-cols-4 gap-3">
        {ICON_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
              value === option.value
                ? "border-blue-500 bg-blue-50"
                : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
            )}
          >
            <img
              src={option.icon}
              alt={option.label}
              className="w-12 h-12 rounded-lg"
            />
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
