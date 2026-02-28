import { useQuery } from "@tanstack/react-query";
import { FolderIcon, type LucideIcon, Settings2Icon } from "lucide-react";
import type { ReactNode } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as settingsCommands } from "@hypr/plugin-settings";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function StorageSettingsView() {
  const { data: othersBase } = useQuery({
    queryKey: ["others-base-path"],
    queryFn: async () => {
      const result = await settingsCommands.globalBase();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const { data: contentBase } = useQuery({
    queryKey: ["content-base-path"],
    queryFn: async () => {
      const result = await settingsCommands.vaultBase();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  return (
    <div>
      <h2 className="mb-4 font-serif text-lg font-semibold">Storage</h2>
      <div className="flex flex-col gap-3">
        <StoragePathRow
          icon={FolderIcon}
          title="Content"
          description="Stores your notes, recordings, and session data"
          path={contentBase}
          action={
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" disabled>
                    Customize
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Coming soon</p>
              </TooltipContent>
            </Tooltip>
          }
        />
        <StoragePathRow
          icon={Settings2Icon}
          title="Others"
          description="Stores app-wide settings and configurations"
          path={othersBase}
        />
      </div>
    </div>
  );
}

function StoragePathRow({
  icon: Icon,
  title,
  description,
  path,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  path: string | undefined;
  action?: ReactNode;
}) {
  const handleOpenPath = () => {
    if (path) {
      openerCommands.openPath(path, null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex w-24 shrink-0 cursor-default items-center gap-2">
            <Icon className="size-4 text-neutral-500" />
            <span className="text-sm font-medium">{title}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
      <button
        onClick={handleOpenPath}
        className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm text-neutral-500 hover:underline"
      >
        {path ?? "Loading..."}
      </button>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
