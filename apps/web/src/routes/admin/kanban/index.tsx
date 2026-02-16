import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ExternalLinkIcon,
  GripVerticalIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import type {
  ProjectItem,
  ProjectV2,
  StatusOption,
} from "@/functions/github-projects";

export const Route = createFileRoute("/admin/kanban/")({
  component: KanbanPage,
});

function KanbanPage() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["kanban-projects"],
    queryFn: async () => {
      const response = await fetch("/api/admin/kanban/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json() as Promise<{ projects: ProjectV2[] }>;
    },
  });

  const projects = projectsData?.projects ?? [];

  const activeProject = selectedProject ?? projects[0] ?? null;

  const {
    data: itemsData,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["kanban-items", activeProject?.number, activeProject?.id],
    queryFn: async () => {
      if (!activeProject)
        return { items: [], statusField: { fieldId: "", options: [] } };
      const params = new URLSearchParams({
        projectNumber: String(activeProject.number),
        projectId: activeProject.id,
      });
      const response = await fetch(`/api/admin/kanban/items?${params}`);
      if (!response.ok) throw new Error("Failed to fetch items");
      return response.json() as Promise<{
        items: ProjectItem[];
        statusField: { fieldId: string; options: StatusOption[] };
      }>;
    },
    enabled: !!activeProject,
  });

  const items = itemsData?.items ?? [];
  const statusField = itemsData?.statusField ?? { fieldId: "", options: [] };

  const columns = useMemo(() => {
    const statusOptions = statusField.options;
    if (statusOptions.length === 0) {
      const statusGroups = new Map<string, ProjectItem[]>();
      for (const item of items) {
        const status = item.status ?? "No Status";
        if (!statusGroups.has(status)) {
          statusGroups.set(status, []);
        }
        statusGroups.get(status)!.push(item);
      }
      return Array.from(statusGroups.entries()).map(([name, columnItems]) => ({
        id: name,
        name,
        items: columnItems,
      }));
    }

    const cols = statusOptions.map((opt) => ({
      id: opt.id,
      name: opt.name,
      items: items.filter((item) => item.status === opt.name),
    }));

    const noStatus = items.filter(
      (item) =>
        !item.status || !statusOptions.some((opt) => opt.name === item.status),
    );
    if (noStatus.length > 0) {
      cols.unshift({ id: "no-status", name: "No Status", items: noStatus });
    }

    return cols;
  }, [items, statusField.options]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      body: string;
      labels?: string[];
    }) => {
      const response = await fetch("/api/admin/kanban/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          projectId: activeProject?.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to create issue");
      return response.json() as Promise<{
        issue: { id: string; number: number; url: string };
        warning?: string;
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-items"] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      issueId?: string;
      title?: string;
      body?: string;
      projectId?: string;
      itemId?: string;
      fieldId?: string;
      optionId?: string;
    }) => {
      const response = await fetch("/api/admin/kanban/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-items"] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (data: {
      issueId: string;
      projectId?: string;
      itemId?: string;
    }) => {
      const response = await fetch("/api/admin/kanban/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-items"] });
    },
  });

  const handleStatusChange = useCallback(
    (item: ProjectItem, newStatusOptionId: string) => {
      if (!activeProject) return;
      updateMutation.mutate({
        projectId: activeProject.id,
        itemId: item.id,
        fieldId: statusField.fieldId,
        optionId: newStatusOptionId,
      });
    },
    [activeProject, statusField.fieldId, updateMutation],
  );

  const handleDelete = useCallback(
    (item: ProjectItem) => {
      deleteMutation.mutate({
        issueId: item.issueId,
        projectId: activeProject?.id,
        itemId: item.id,
      });
    },
    [activeProject, deleteMutation],
  );

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-neutral-900">Kanban</h1>
            <span className="text-sm text-neutral-500">fastrepl/marketing</span>
            {projects.length > 1 && (
              <select
                value={activeProject?.id ?? ""}
                onChange={(e) => {
                  const p = projects.find((pr) => pr.id === e.target.value);
                  if (p) setSelectedProject(p);
                }}
                className="h-8 px-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
            {activeProject && (
              <span className="text-xs text-neutral-400">
                {items.length} items
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchItems()}
              disabled={itemsLoading}
              className="h-8 px-3 text-sm flex items-center gap-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <RefreshCwIcon
                className={cn("w-3.5 h-3.5", itemsLoading && "animate-spin")}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="h-8 px-3 text-sm flex items-center gap-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New Issue
            </button>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
          <p className="text-sm font-medium">No projects found</p>
          <p className="text-xs mt-1">
            Create a GitHub Project in fastrepl/marketing to get started
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto p-4">
          {itemsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size={24} />
            </div>
          ) : (
            <div className="flex gap-4 h-full min-w-max">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  name={column.name}
                  items={column.items}
                  statusOptions={statusField.options}
                  onStatusChange={handleStatusChange}
                  onEdit={setEditingItem}
                  onDelete={handleDelete}
                  isUpdating={updateMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isCreating && (
        <CreateIssueModal
          onClose={() => setIsCreating(false)}
          onSubmit={(title, body) => createMutation.mutate({ title, body })}
          isPending={createMutation.isPending}
        />
      )}

      {editingItem && (
        <EditIssueModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSubmit={(title, body) =>
            updateMutation.mutate({
              issueId: editingItem.issueId,
              title,
              body,
            })
          }
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  name,
  items,
  statusOptions,
  onStatusChange,
  onEdit,
  onDelete,
  isUpdating,
}: {
  name: string;
  items: ProjectItem[];
  statusOptions: StatusOption[];
  onStatusChange: (item: ProjectItem, optionId: string) => void;
  onEdit: (item: ProjectItem) => void;
  onDelete: (item: ProjectItem) => void;
  isUpdating: boolean;
}) {
  const COLUMN_COLORS: Record<string, string> = {
    Todo: "border-t-blue-400",
    "In Progress": "border-t-yellow-400",
    Done: "border-t-green-400",
    Backlog: "border-t-neutral-300",
    "No Status": "border-t-neutral-200",
  };

  return (
    <div
      className={cn(
        "w-72 flex flex-col bg-neutral-50 rounded-lg border border-neutral-200 border-t-2",
        COLUMN_COLORS[name] || "border-t-neutral-300",
      )}
    >
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">{name}</span>
          <span className="text-xs text-neutral-400 bg-neutral-200 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-2">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            statusOptions={statusOptions}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  item,
  statusOptions,
  onStatusChange,
  onEdit,
  onDelete,
  isUpdating,
}: {
  item: ProjectItem;
  statusOptions: StatusOption[];
  onStatusChange: (item: ProjectItem, optionId: string) => void;
  onEdit: (item: ProjectItem) => void;
  onDelete: (item: ProjectItem) => void;
  isUpdating: boolean;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bg-white rounded-md border border-neutral-200 shadow-xs hover:shadow-sm transition-shadow"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          <GripVerticalIcon className="w-3.5 h-3.5 text-neutral-300 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-sm font-medium text-neutral-900 hover:text-blue-600 text-left truncate"
              >
                {item.title}
              </button>
              {showActions && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 text-neutral-400 hover:text-neutral-600 rounded"
                  >
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    className="p-0.5 text-neutral-400 hover:text-red-500 rounded"
                  >
                    <Trash2Icon className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <span className="text-xs text-neutral-400">
              #{item.issueNumber}
            </span>
          </div>
        </div>

        {item.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.labels.map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-600"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {statusOptions.length > 0 && (
          <div className="mt-2">
            <select
              value={
                statusOptions.find((o) => o.name === item.status)?.id ?? ""
              }
              onChange={(e) => onStatusChange(item, e.target.value)}
              disabled={isUpdating}
              className="w-full h-6 px-1 text-[11px] border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-300 disabled:opacity-50"
            >
              <option value="">No Status</option>
              {statusOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {item.assignees.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {item.assignees.map((assignee) => (
              <span
                key={assignee}
                className="text-[10px] text-neutral-500 bg-neutral-50 px-1.5 py-0.5 rounded"
              >
                @{assignee}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateIssueModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), body.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-900">
            Create Issue
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title..."
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the issue..."
              rows={5}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isPending}
              className="h-8 px-4 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isPending && <Spinner size={12} color="white" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditIssueModal({
  item,
  onClose,
  onSubmit,
  isPending,
}: {
  item: ProjectItem;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), body.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-900">
            Edit Issue #{item.issueNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLinkIcon className="w-3 h-3" />
              View on GitHub
            </a>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isPending}
                className="h-8 px-4 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && <Spinner size={12} color="white" />}
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
