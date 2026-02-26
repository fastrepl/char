import { Copy } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";

export function ResourcePreviewHeader({
  title,
  description,
  category,
  targets,
  onClone,
  children,
}: {
  title: string;
  description?: string | null;
  category?: string | null;
  targets?: string[] | null;
  onClone: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="px-6 py-4 border-b border-neutral-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">
            {title || "Untitled"}
          </h2>
          {description && (
            <p className="text-sm text-neutral-500 mt-1">{description}</p>
          )}
        </div>
        <Button onClick={onClone} size="sm" className="ml-4 shrink-0">
          <Copy className="h-4 w-4 mr-2" />
          Clone
        </Button>
      </div>
      {category && (
        <div className="mt-2">
          <span className="text-xs text-stone-400 font-mono">({category})</span>
        </div>
      )}
      {targets && targets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {targets.map((target, index) => (
            <span
              key={index}
              className="text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-xs"
            >
              {target}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
