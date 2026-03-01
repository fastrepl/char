import { ChevronUpIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import type { ContextEntity, ContextRef } from "~/chat/context-item";
import { type ContextChipProps, renderChip } from "~/chat/context/registry";
import { useSearchEngine } from "~/search/contexts/engine";

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
            "group max-w-48 cursor-default rounded-md bg-neutral-500/10 px-1.5 py-0.5 text-xs text-neutral-600",
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
              className="ml-0.5 hidden items-center justify-center rounded-sm group-hover:inline-flex hover:bg-neutral-500/20"
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

function SessionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (sessionId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; title: string; created_at: number }>
  >([]);
  const { search } = useSearchEngine();

  useEffect(() => {
    search(query, { created_at: undefined }).then((hits) => {
      setResults(
        hits
          .filter((h) => h.document.type === "session")
          .slice(0, 8)
          .map((h) => ({
            id: h.document.id,
            title: h.document.title,
            created_at: h.document.created_at,
          })),
      );
    });
  }, [query, search]);

  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sessions..."
        className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
      />
      <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
        {results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => {
              onSelect(result.id);
              onClose();
            }}
            className="flex flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-100"
          >
            <span className="w-full truncate text-xs font-medium text-neutral-700">
              {result.title || "Untitled"}
            </span>
            <span className="text-[10px] text-neutral-400">
              {new Date(result.created_at).toLocaleDateString()}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <span className="px-2 py-1.5 text-xs text-neutral-400">
            No sessions found
          </span>
        )}
      </div>
    </div>
  );
}

export function ContextBar({
  entities,
  onRemoveEntity,
  onAddEntity,
}: {
  entities: ContextEntity[];
  onRemoveEntity?: (key: string) => void;
  onAddEntity?: (ref: ContextRef) => void;
}) {
  const chips = useMemo(
    () =>
      entities.map(renderChip).filter((c): c is ContextChipProps => c !== null),
    [entities],
  );

  const innerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(chips.length);
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  if (chips.length === 0 && !onAddEntity) return null;

  const hasOverflow = visibleCount < chips.length;
  const displayChips = chips.slice(0, visibleCount);

  const handleSelectSession = async (sessionId: string) => {
    if (!onAddEntity) return;
    onAddEntity({
      kind: "session",
      key: `session:manual:${sessionId}`,
      source: "manual",
      sessionId,
    });
  };

  return (
    <div className="relative mx-2 rounded-t-xl border-t border-r border-l border-neutral-200 bg-neutral-100">
      {expanded && (
        <div className="absolute right-0 bottom-full left-0 max-h-40 overflow-y-auto rounded-t-lg border-b border-neutral-200/60 bg-neutral-100 px-2.5 py-2">
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
        className="flex items-center gap-1.5 overflow-hidden px-2.5 py-2"
      >
        {displayChips.map((chip) => (
          <ContextChip key={chip.key} chip={chip} onRemove={onRemoveEntity} />
        ))}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn([
              "inline-flex shrink-0 items-center justify-center rounded-md bg-neutral-500/10 px-1 py-0.5 text-xs text-neutral-400 transition-colors hover:bg-neutral-500/20 hover:text-neutral-600",
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
        {onAddEntity && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn([
                  "inline-flex shrink-0 items-center justify-center rounded-md bg-neutral-500/10 p-0.5 text-neutral-400 transition-colors hover:bg-neutral-500/20 hover:text-neutral-600",
                ])}
              >
                <PlusIcon className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-64 p-3">
              <SessionPicker
                onSelect={handleSelectSession}
                onClose={() => setPickerOpen(false)}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
