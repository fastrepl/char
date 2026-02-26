import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";
import type { SearchResult } from "~/search/contexts/ui";

import { cn } from "@hypr/utils";

const TYPE_ICONS = {
  session: FileTextIcon,
  human: UserIcon,
  organization: Building2Icon,
};

interface ResultItemProps {
  result: SearchResult;
  onClick: () => void;
  isSelected?: boolean;
}

export function ResultItem({ result, onClick, isSelected }: ResultItemProps) {
  const Icon = TYPE_ICONS[result.type] || FileTextIcon;

  return (
    <button
      data-result-id={result.id}
      onClick={onClick}
      className={cn([
        "w-full flex items-start gap-3 p-3",
        "rounded-lg text-left",
        "hover:bg-neutral-100 transition-colors",
        isSelected && "bg-neutral-100",
      ])}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-neutral-900 truncate"
          dangerouslySetInnerHTML={{ __html: result.titleHighlighted }}
        />
        {result.content && (
          <div
            className="text-sm text-neutral-500 truncate mt-0.5"
            dangerouslySetInnerHTML={{ __html: result.contentHighlighted }}
          />
        )}
      </div>
    </button>
  );
}
