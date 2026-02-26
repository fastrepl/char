import { ChevronUpIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import type { ContextEntity } from "../../chat/context-item";
import { type ContextChipProps, renderChip } from "../../chat/context/registry";

function ContextChip({
  chip,
  onRemove,
}: {
  chip: ContextChipProps;
  onRemove?: (key: string) => void;
}) {
  const Icon = chip.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn([
            "group max-w-48 rounded-md bg-neutral-500/10 px-1.5 py-0.5 text-xs text-neutral-600 cursor-default",
            "inline-flex items-center gap-1",
          ])}
        >
          {Icon && <Icon className="size-3 shrink-0 text-neutral-400" />}
          <span className="truncate">{chip.label}</span>
          {chip.removable && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(chip.key);
              }}
              className="hidden group-hover:inline-flex items-center justify-center rounded-sm hover:bg-neutral-500/20 ml-0.5"
            >
              <XIcon className="size-2.5" />
            </button>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-110 max-w-64 whitespace-pre-wrap">
        {chip.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function ContextBar({
  entities,
  onRemoveEntity,
}: {
  entities: ContextEntity[];
  onRemoveEntity?: (key: string) => void;
}) {
  const chips = useMemo(
    () =>
      entities.map(renderChip).filter((c): c is ContextChipProps => c !== null),
    [entities],
  );

  const innerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(chips.length);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setVisibleCount(chips.length);
  }, [chips.length]);

  useEffect(() => {
    if (expanded) return;

    const inner = innerRef.current;
    if (!inner || chips.length === 0) return;

    const measure = () => {
      const children = Array.from(inner.children) as HTMLElement[];
      if (children.length === 0) return;

      const containerRight = inner.getBoundingClientRect().right;
      const gap = 6;
      const expandButtonWidth = 28;

      let count = 0;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childRight = child.getBoundingClientRect().right;

        if (i < chips.length) {
          const needsOverflow = i < chips.length - 1;
          const threshold = needsOverflow
            ? containerRight - expandButtonWidth - gap
            : containerRight;

          if (childRight <= threshold) {
            count++;
          } else {
            break;
          }
        }
      }

      if (count < chips.length && count === 0) {
        count = 1;
      }

      setVisibleCount(count);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    measure();

    return () => observer.disconnect();
  }, [chips, expanded]);

  useEffect(() => {
    setExpanded(false);
  }, [chips.length]);

  if (chips.length === 0) return null;

  const hasOverflow = visibleCount < chips.length;
  const displayChips = chips.slice(0, visibleCount);

  return (
    <div className="relative mx-2 rounded-t-xl border-t border-l border-r border-neutral-200 bg-neutral-100">
      {expanded && (
        <div className="absolute bottom-full left-0 right-0 rounded-t-lg bg-neutral-100 border-b border-neutral-200/60 max-h-40 overflow-y-auto px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.slice(visibleCount).map((chip) => (
              <ContextChip
                key={chip.key}
                chip={chip}
                onRemove={onRemoveEntity}
              />
            ))}
          </div>
        </div>
      )}
      <div
        ref={innerRef}
        className="flex items-center gap-1.5 px-2.5 py-2 overflow-hidden"
      >
        {displayChips.map((chip) => (
          <ContextChip key={chip.key} chip={chip} onRemove={onRemoveEntity} />
        ))}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn([
              "shrink-0 inline-flex items-center justify-center rounded-md bg-neutral-500/10 px-1 py-0.5 text-xs text-neutral-400 hover:text-neutral-600 hover:bg-neutral-500/20 transition-colors",
            ])}
          >
            {expanded ? (
              <ChevronUpIcon className="size-3.5 rotate-180" />
            ) : (
              <span className="inline-flex items-center gap-0.5">
                +{chips.length - visibleCount}
                <ChevronUpIcon className="size-3" />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
