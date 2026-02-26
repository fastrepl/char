import { Command as CommandPrimitive } from "cmdk";
import { FileTextIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as main from "~/store/tinybase/store/main";
import { useTabs } from "~/store/zustand/tabs";

import { Kbd } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";

const MAX_RECENT_DISPLAY = 5;

interface OpenNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Session = {
  id: string;
  title: string;
  createdAt: string;
};

export function OpenNoteDialog({ open, onOpenChange }: OpenNoteDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const openCurrent = useTabs((state) => state.openCurrent);
  const recentlyOpenedSessionIds = useTabs(
    (state) => state.recentlyOpenedSessionIds,
  );

  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const sessionsMap = useMemo(() => {
    if (!store || !sessionIds) return new Map<string, Session>();

    const map = new Map<string, Session>();
    for (const id of sessionIds) {
      map.set(id, {
        id,
        title: (store.getCell("sessions", id, "title") as string) || "Untitled",
        createdAt: store.getCell("sessions", id, "created_at") as string,
      });
    }
    return map;
  }, [sessionIds, store]);

  const allSessionsSortedByDate = useMemo(() => {
    return Array.from(sessionsMap.values()).sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sessionsMap]);

  const recentSessions = useMemo(() => {
    return recentlyOpenedSessionIds
      .slice(0, MAX_RECENT_DISPLAY)
      .map((id) => sessionsMap.get(id))
      .filter((s): s is Session => s !== undefined);
  }, [recentlyOpenedSessionIds, sessionsMap]);

  const recentSessionIdSet = useMemo(() => {
    return new Set(recentSessions.map((s) => s.id));
  }, [recentSessions]);

  const otherSessions = useMemo(() => {
    return allSessionsSortedByDate.filter((s) => !recentSessionIdSet.has(s.id));
  }, [allSessionsSortedByDate, recentSessionIdSet]);

  const filteredRecentSessions = useMemo(() => {
    if (!query.trim()) return recentSessions;
    const lowerQuery = query.toLowerCase();
    return recentSessions.filter((s) =>
      s.title.toLowerCase().includes(lowerQuery),
    );
  }, [recentSessions, query]);

  const filteredOtherSessions = useMemo(() => {
    if (!query.trim()) return otherSessions;
    const lowerQuery = query.toLowerCase();
    return otherSessions.filter((s) =>
      s.title.toLowerCase().includes(lowerQuery),
    );
  }, [otherSessions, query]);

  const hasAnyResults =
    filteredRecentSessions.length > 0 || filteredOtherSessions.length > 0;

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      onOpenChange(false);
      openCurrent({ type: "sessions", id: sessionId });
    },
    [onOpenChange, openCurrent],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs"
      onClick={() => onOpenChange(false)}
    >
      <div
        data-tauri-drag-region
        className="absolute top-0 left-0 right-0 h-[15%]"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-lg px-4">
        <div
          className={cn([
            "bg-[#faf8f5] rounded-xl border border-neutral-200/80",
            "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]",
            "overflow-hidden",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <CommandPrimitive
            shouldFilter={false}
            className="flex flex-col"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onOpenChange(false);
              }
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200/60">
              <SearchIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              <CommandPrimitive.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Find a note..."
                className={cn([
                  "flex-1 text-sm bg-transparent",
                  "outline-hidden placeholder:text-neutral-400",
                ])}
              />
              <button
                onClick={() => onOpenChange(false)}
                className={cn([
                  "w-5 h-5 rounded-full",
                  "flex items-center justify-center",
                  "bg-neutral-200/80 hover:bg-neutral-300/80",
                  "text-neutral-500 text-xs",
                  "transition-colors",
                ])}
              >
                ×
              </button>
            </div>

            <CommandPrimitive.List className="max-h-80 overflow-y-auto p-2">
              {!hasAnyResults ? (
                <CommandPrimitive.Empty className="py-6 text-center text-sm text-neutral-500">
                  No notes found.
                </CommandPrimitive.Empty>
              ) : (
                <>
                  {filteredRecentSessions.length > 0 && (
                    <CommandPrimitive.Group
                      className={
                        filteredOtherSessions.length > 0 ? "pb-1.5" : ""
                      }
                      heading={
                        <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Recent
                        </div>
                      }
                    >
                      {filteredRecentSessions.map((session) => (
                        <CommandPrimitive.Item
                          key={`recent-${session.id}`}
                          value={`recent-${session.id}`}
                          onSelect={() => handleSelect(session.id)}
                          className={cn([
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                            "text-sm text-neutral-700",
                            "data-[selected=true]:bg-neutral-200/60",
                            "transition-colors",
                          ])}
                        >
                          <FileTextIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.Group>
                  )}

                  {filteredOtherSessions.length > 0 && (
                    <CommandPrimitive.Group
                      heading={
                        <div className="flex flex-col gap-3">
                          {filteredRecentSessions.length > 0 && (
                            <div className="h-px bg-neutral-200 mx-2" />
                          )}
                          <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            All Notes
                          </div>
                        </div>
                      }
                    >
                      {filteredOtherSessions.map((session) => (
                        <CommandPrimitive.Item
                          key={session.id}
                          value={session.id}
                          onSelect={() => handleSelect(session.id)}
                          className={cn([
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                            "text-sm text-neutral-700",
                            "data-[selected=true]:bg-neutral-200/60",
                            "transition-colors",
                          ])}
                        >
                          <FileTextIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.Group>
                  )}
                </>
              )}
            </CommandPrimitive.List>

            <div
              className={cn([
                "flex items-center justify-center gap-4 px-4 py-2.5",
                "border-t border-neutral-200/60",
                "text-xs text-neutral-400",
              ])}
            >
              <span className="flex items-center gap-1.5">
                <Kbd className="text-[10px]">↑↓</Kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd className="text-[10px]">↵</Kbd>
                <span>to open</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd className="text-[10px]">esc</Kbd>
                <span>to dismiss</span>
              </span>
            </div>
          </CommandPrimitive>
        </div>
      </div>
    </div>,
    document.body,
  );
}
