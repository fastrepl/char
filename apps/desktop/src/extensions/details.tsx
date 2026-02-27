import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FolderOpen, Play } from "lucide-react";
import { useTabs } from "~/store/zustand/tabs";

import { Button } from "@hypr/ui/components/ui/button";

import { getExtension } from "./registry";

export function ExtensionDetailsColumn({
  selectedExtensionId,
}: {
  selectedExtensionId: string | null;
}) {
  if (!selectedExtensionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-neutral-500">
          Select an extension to view details
        </p>
      </div>
    );
  }

  return (
    <ExtensionDetails key={selectedExtensionId} id={selectedExtensionId} />
  );
}

function ExtensionDetails({ id }: { id: string }) {
  const openNew = useTabs((state) => state.openNew);

  const { data: extension, isLoading } = useQuery({
    queryKey: ["extensions", "detail", id],
    queryFn: () => getExtension(id),
  });

  const handleOpenPanel = () => {
    openNew({ type: "extension", extensionId: id });
  };

  const handleOpenFolder = async () => {
    if (extension?.path) {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(extension.path);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!extension) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-neutral-500">Extension not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{extension.name}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Version {extension.version}
            </p>
          </div>
          <div className="flex gap-2">
            {extension.panels.length > 0 && (
              <Button size="sm" onClick={handleOpenPanel}>
                <Play size={14} className="mr-1" />
                Open
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {extension.description && (
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-2">
                Description
              </h3>
              <p className="text-sm text-neutral-600">
                {extension.description}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-neutral-900 mb-2">
              Details
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">ID</span>
                <span className="font-mono text-neutral-900">
                  {extension.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">API Version</span>
                <span className="font-mono text-neutral-900">
                  {extension.api_version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Panels</span>
                <span className="text-neutral-900">
                  {extension.panels.length}
                </span>
              </div>
            </div>
          </div>

          {extension.panels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-2">
                Panels
              </h3>
              <div className="flex flex-col gap-2">
                {extension.panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{panel.title}</p>
                      <p className="text-xs text-neutral-500 font-mono">
                        {panel.id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-neutral-900 mb-2">
              Location
            </h3>
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <FolderOpen size={14} />
              <span className="font-mono text-xs truncate max-w-[300px]">
                {extension.path}
              </span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
