import { Building2, CornerDownLeft, Pin, User } from "lucide-react";
import { Reorder } from "motion/react";
import React, { useCallback, useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/store/main";
import { ColumnHeader, type SortOption } from "./shared";

export function OrganizationsColumn({
  selectedOrganization,
  setSelectedOrganization,
  isViewingOrgDetails,
}: {
  selectedOrganization: string | null;
  setSelectedOrganization: (id: string | null) => void;
  isViewingOrgDetails: boolean;
}) {
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { pinnedIds, unpinnedIds, sortOption, setSortOption } =
    useSortedOrganizationIds();

  const allOrgs = main.UI.useTable("organizations", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const filteredPinnedIds = useMemo(() => {
    if (!searchValue.trim()) return pinnedIds;
    const q = searchValue.toLowerCase();
    return pinnedIds.filter((id) => {
      const nameLower = (allOrgs[id]?.name ?? "").toLowerCase();
      return nameLower.includes(q);
    });
  }, [pinnedIds, searchValue, allOrgs]);

  const filteredUnpinnedIds = useMemo(() => {
    if (!searchValue.trim()) return unpinnedIds;
    const q = searchValue.toLowerCase();
    return unpinnedIds.filter((id) => {
      const nameLower = (allOrgs[id]?.name ?? "").toLowerCase();
      return nameLower.includes(q);
    });
  }, [unpinnedIds, searchValue, allOrgs]);

  const handleReorderPinned = useCallback(
    (newOrder: string[]) => {
      if (!store) return;
      store.transaction(() => {
        newOrder.forEach((id, index) => {
          store.setCell("organizations", id, "pin_order", index);
        });
      });
    },
    [store],
  );

  return (
    <div className="w-full h-full flex flex-col">
      <ColumnHeader
        title="Organizations"
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={() => setShowNewOrg(true)}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <button
            onClick={() => setSelectedOrganization(null)}
            className={cn([
              "w-full text-left px-3 py-2 rounded-md text-sm truncate flex items-center gap-2 hover:bg-neutral-100 transition-colors",
              !selectedOrganization && "bg-neutral-100",
            ])}
          >
            <User className="h-4 w-4 text-neutral-500 shrink-0" />
            All People
          </button>
          {showNewOrg && (
            <NewOrganizationForm
              onSave={() => setShowNewOrg(false)}
              onCancel={() => setShowNewOrg(false)}
            />
          )}
          {filteredPinnedIds.length > 0 && (
            <Reorder.Group
              axis="y"
              values={filteredPinnedIds}
              onReorder={handleReorderPinned}
              className="flex flex-col"
            >
              {filteredPinnedIds.map((orgId) => (
                <Reorder.Item key={orgId} value={orgId}>
                  <OrganizationItem
                    organizationId={orgId}
                    isSelected={selectedOrganization === orgId}
                    isViewingDetails={
                      isViewingOrgDetails && selectedOrganization === orgId
                    }
                    setSelectedOrganization={setSelectedOrganization}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
          {filteredPinnedIds.length > 0 && filteredUnpinnedIds.length > 0 && (
            <div className="h-px bg-neutral-200 mx-3 my-1" />
          )}
          {filteredUnpinnedIds.map((orgId) => (
            <OrganizationItem
              key={orgId}
              organizationId={orgId}
              isSelected={selectedOrganization === orgId}
              isViewingDetails={
                isViewingOrgDetails && selectedOrganization === orgId
              }
              setSelectedOrganization={setSelectedOrganization}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function useSortedOrganizationIds() {
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const alphabeticalIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleOrganizations,
    "name",
    false,
    0,
    undefined,
    main.STORE_ID,
  );
  const reverseAlphabeticalIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleOrganizations,
    "name",
    true,
    0,
    undefined,
    main.STORE_ID,
  );
  const newestIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleOrganizations,
    "created_at",
    true,
    0,
    undefined,
    main.STORE_ID,
  );
  const oldestIds = main.UI.useResultSortedRowIds(
    main.QUERIES.visibleOrganizations,
    "created_at",
    false,
    0,
    undefined,
    main.STORE_ID,
  );

  const sortedIds =
    sortOption === "alphabetical"
      ? alphabeticalIds
      : sortOption === "reverse-alphabetical"
        ? reverseAlphabeticalIds
        : sortOption === "newest"
          ? newestIds
          : oldestIds;

  const allOrgs = main.UI.useTable("organizations", main.STORE_ID);

  const { pinnedIds, unpinnedIds } = useMemo(() => {
    const pinned = sortedIds.filter((id) => allOrgs[id]?.pinned);
    const unpinned = sortedIds.filter((id) => !allOrgs[id]?.pinned);

    const sortedPinned = [...pinned].sort((a, b) => {
      const orderA = (allOrgs[a]?.pin_order as number | undefined) ?? Infinity;
      const orderB = (allOrgs[b]?.pin_order as number | undefined) ?? Infinity;
      return orderA - orderB;
    });

    return { pinnedIds: sortedPinned, unpinnedIds: unpinned };
  }, [sortedIds, allOrgs]);

  return { pinnedIds, unpinnedIds, sortOption, setSortOption };
}

function OrganizationItem({
  organizationId,
  isSelected,
  isViewingDetails,
  setSelectedOrganization,
}: {
  organizationId: string;
  isSelected: boolean;
  isViewingDetails: boolean;
  setSelectedOrganization: (id: string | null) => void;
}) {
  const organization = main.UI.useRow(
    "organizations",
    organizationId,
    main.STORE_ID,
  );
  const isPinned = Boolean(organization.pinned);
  const store = main.UI.useStore(main.STORE_ID);

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!store) return;

      const currentPinned = store.getCell(
        "organizations",
        organizationId,
        "pinned",
      );
      if (currentPinned) {
        store.setPartialRow("organizations", organizationId, {
          pinned: false,
          pin_order: undefined,
        });
      } else {
        const allOrgs = store.getTable("organizations");
        const maxOrder = Object.values(allOrgs).reduce((max, o) => {
          const order = (o.pin_order as number | undefined) ?? 0;
          return Math.max(max, order);
        }, 0);
        store.setPartialRow("organizations", organizationId, {
          pinned: true,
          pin_order: maxOrder + 1,
        });
      }
    },
    [store, organizationId],
  );

  if (!organization) {
    return null;
  }

  return (
    <div
      className={cn([
        "group relative rounded-md transition-colors border",
        isSelected && "bg-neutral-100",
        isSelected && isViewingDetails ? "border-black" : "border-transparent",
      ])}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelectedOrganization(organizationId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedOrganization(organizationId);
          }
        }}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-100 transition-colors rounded-md"
      >
        <Building2 className="h-4 w-4 text-neutral-500 shrink-0" />
        <p className="flex-1 truncate">{organization.name}</p>
        <button
          onClick={handleTogglePin}
          className={cn([
            "shrink-0 p-1 rounded-xs transition-colors",
            isPinned
              ? "text-blue-600 hover:text-blue-700"
              : "text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-500",
          ])}
          aria-label={isPinned ? "Unpin organization" : "Pin organization"}
        >
          <Pin className="size-3.5" fill={isPinned ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

function NewOrganizationForm({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const userId = main.UI.useValue("user_id", main.STORE_ID);

  const handleAdd = main.UI.useAddRowCallback(
    "organizations",
    () => ({
      user_id: userId || "",
      name: name.trim(),
      created_at: new Date().toISOString(),
    }),
    [name, userId],
    main.STORE_ID,
    () => {
      setName("");
      onSave();
    },
  );

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
            placeholder="Add organization"
            className="w-full bg-transparent text-sm focus:outline-hidden placeholder:text-neutral-400"
            autoFocus
          />
          {name.trim() && (
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors shrink-0"
              aria-label="Add organization"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
