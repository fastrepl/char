import { Facehash } from "facehash";
import { CornerDownLeft, Pin } from "lucide-react";
import { Reorder } from "motion/react";
import React, { useCallback, useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/store/main";
import { ColumnHeader, type SortOption } from "./shared";

export function PeopleColumn({
  currentOrgId,
  currentHumanId,
  setSelectedPerson,
}: {
  currentOrgId?: string | null;
  currentHumanId?: string | null;
  setSelectedPerson: (id: string | null) => void;
}) {
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { humanIds, pinnedIds, unpinnedIds, sortOption, setSortOption } =
    useSortedHumanIds(currentOrgId);

  const allHumans = main.UI.useTable("humans", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const filteredHumanIds = useMemo(() => {
    if (!searchValue.trim()) {
      return humanIds;
    }

    return humanIds.filter((id) => {
      const human = allHumans[id];
      const q = searchValue.toLowerCase();
      const name = (human?.name ?? "").toLowerCase();
      const email = (human?.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [humanIds, searchValue, allHumans]);

  const filteredPinnedIds = useMemo(() => {
    if (!searchValue.trim()) {
      return pinnedIds;
    }
    return pinnedIds.filter((id) => filteredHumanIds.includes(id));
  }, [pinnedIds, filteredHumanIds, searchValue]);

  const filteredUnpinnedIds = useMemo(() => {
    if (!searchValue.trim()) {
      return unpinnedIds;
    }
    return unpinnedIds.filter((id) => filteredHumanIds.includes(id));
  }, [unpinnedIds, filteredHumanIds, searchValue]);

  const handleReorderPinned = useCallback(
    (newOrder: string[]) => {
      if (!store) return;
      store.transaction(() => {
        newOrder.forEach((id, index) => {
          store.setCell("humans", id, "pin_order", index);
        });
      });
    },
    [store],
  );

  return (
    <div className="w-full h-full flex flex-col">
      <ColumnHeader
        title="People"
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={() => setShowNewPerson(true)}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {showNewPerson && (
            <NewPersonForm
              currentOrgId={currentOrgId}
              onSave={(humanId) => {
                setShowNewPerson(false);
                setSelectedPerson(humanId);
              }}
              onCancel={() => setShowNewPerson(false)}
            />
          )}
          {filteredPinnedIds.length > 0 && (
            <Reorder.Group
              axis="y"
              values={filteredPinnedIds}
              onReorder={handleReorderPinned}
              className="flex flex-col"
            >
              {filteredPinnedIds.map((humanId) => (
                <Reorder.Item key={humanId} value={humanId}>
                  <PersonItem
                    active={currentHumanId === humanId}
                    humanId={humanId}
                    setSelectedPerson={setSelectedPerson}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
          {filteredUnpinnedIds.map((humanId) => (
            <PersonItem
              key={humanId}
              active={currentHumanId === humanId}
              humanId={humanId}
              setSelectedPerson={setSelectedPerson}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function useSortedHumanIds(currentOrgId?: string | null) {
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const allAlphabeticalIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleHumans,
    "name",
    false,
    0,
    undefined,
    main.STORE_ID,
  );
  const allReverseAlphabeticalIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleHumans,
    "name",
    true,
    0,
    undefined,
    main.STORE_ID,
  );
  const allNewestIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleHumans,
    "created_at",
    true,
    0,
    undefined,
    main.STORE_ID,
  );
  const allOldestIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleHumans,
    "created_at",
    false,
    0,
    undefined,
    main.STORE_ID,
  );

  const thisOrgHumanIds = main.UI.useSliceRowIds(
    main.INDEXES.humansByOrg,
    currentOrgId ?? "",
    main.STORE_ID,
  );

  const allHumans = main.UI.useTable("humans", main.STORE_ID);

  const sortedIds = currentOrgId
    ? (sortOption === "alphabetical"
        ? allAlphabeticalIds
        : sortOption === "reverse-alphabetical"
          ? allReverseAlphabeticalIds
          : sortOption === "newest"
            ? allNewestIds
            : allOldestIds
      ).filter((id) => thisOrgHumanIds.includes(id))
    : sortOption === "alphabetical"
      ? allAlphabeticalIds
      : sortOption === "reverse-alphabetical"
        ? allReverseAlphabeticalIds
        : sortOption === "newest"
          ? allNewestIds
          : allOldestIds;

  const { humanIds, pinnedIds, unpinnedIds } = useMemo(() => {
    const pinned = sortedIds.filter((id) => allHumans[id]?.pinned);
    const unpinned = sortedIds.filter((id) => !allHumans[id]?.pinned);

    const sortedPinned = [...pinned].sort((a, b) => {
      const orderA =
        (allHumans[a]?.pin_order as number | undefined) ?? Infinity;
      const orderB =
        (allHumans[b]?.pin_order as number | undefined) ?? Infinity;
      return orderA - orderB;
    });

    return {
      humanIds: [...sortedPinned, ...unpinned],
      pinnedIds: sortedPinned,
      unpinnedIds: unpinned,
    };
  }, [sortedIds, allHumans]);

  return { humanIds, pinnedIds, unpinnedIds, sortOption, setSortOption };
}

function PersonItem({
  humanId,
  active,
  setSelectedPerson,
}: {
  humanId: string;
  active: boolean;
  setSelectedPerson: (id: string | null) => void;
}) {
  const person = main.UI.useRow("humans", humanId, main.STORE_ID);
  const isPinned = Boolean(person.pinned);
  const personName = String(person.name ?? "");
  const personEmail = String(person.email ?? "");

  const store = main.UI.useStore(main.STORE_ID);

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!store) return;

      const currentPinned = store.getCell("humans", humanId, "pinned");
      if (currentPinned) {
        store.setPartialRow("humans", humanId, {
          pinned: false,
          pin_order: undefined,
        });
      } else {
        const allHumans = store.getTable("humans");
        const maxOrder = Object.values(allHumans).reduce((max, h) => {
          const order = (h.pin_order as number | undefined) ?? 0;
          return Math.max(max, order);
        }, 0);
        store.setPartialRow("humans", humanId, {
          pinned: true,
          pin_order: maxOrder + 1,
        });
      }
    },
    [store, humanId],
  );

  return (
    <button
      onClick={() => setSelectedPerson(humanId)}
      className={cn([
        "group w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100 transition-colors flex items-center gap-2 bg-white",
        active ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="shrink-0 rounded-full bg-amber-50">
        <Facehash
          name={personName || personEmail || humanId}
          size={32}
          interactive={false}
          showInitial={false}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-1">
          {personName || personEmail || "Unnamed"}
        </div>
        {personEmail && personName && (
          <div className="text-xs text-neutral-500 truncate">{personEmail}</div>
        )}
      </div>
      <button
        onClick={handleTogglePin}
        className={cn([
          "shrink-0 p-1 rounded-xs transition-colors",
          isPinned
            ? "text-blue-600 hover:text-blue-700"
            : "text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-500",
        ])}
        aria-label={isPinned ? "Unpin contact" : "Pin contact"}
      >
        <Pin className="size-3.5" fill={isPinned ? "currentColor" : "none"} />
      </button>
    </button>
  );
}

function NewPersonForm({
  currentOrgId,
  onSave,
  onCancel,
}: {
  currentOrgId?: string | null;
  onSave: (humanId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const userId = main.UI.useValue("user_id", main.STORE_ID);

  const createHuman = main.UI.useSetRowCallback(
    "humans",
    (p: { name: string; humanId: string }) => p.humanId,
    (p: { name: string; humanId: string }) => ({
      user_id: userId || "",
      created_at: new Date().toISOString(),
      name: p.name,
      email: "",
      org_id: currentOrgId || "",
      job_title: "",
      linkedin_username: "",
      memo: "",
      pinned: false,
    }),
    [userId, currentOrgId],
    main.STORE_ID,
  );

  const handleAdd = () => {
    const humanId = crypto.randomUUID();
    createHuman({ humanId, name: name.trim() });
    setName("");
    onSave(humanId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      handleAdd();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (name.trim()) {
        handleAdd();
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="p-2">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded-xs bg-neutral-50 border border-neutral-200">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add person"
            className="w-full bg-transparent text-sm focus:outline-hidden placeholder:text-neutral-400"
            autoFocus
          />
          {name.trim() && (
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors shrink-0"
              aria-label="Add person"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
