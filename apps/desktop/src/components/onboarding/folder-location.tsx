import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open as selectFolder } from "@tauri-apps/plugin-dialog";
import { FolderIcon } from "lucide-react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as settingsCommands } from "@hypr/plugin-settings";

export function FolderLocationSection({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: vaultBase } = useQuery({
    queryKey: ["vault-base-path"],
    queryFn: async () => {
      const result = await settingsCommands.vaultBase();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const changeMutation = useMutation({
    mutationFn: async (newPath: string) => {
      const result = await settingsCommands.changeVaultBase(newPath);
      if (result.status === "error") {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-base-path"] });
    },
  });

  const handleChange = async () => {
    const selected = await selectFolder({
      title: "Choose storage location",
      directory: true,
      multiple: false,
      defaultPath: vaultBase ?? undefined,
    });

    if (selected) {
      changeMutation.mutate(selected);
    }
  };

  const handleOpenPath = () => {
    if (vaultBase) {
      openerCommands.openPath(vaultBase, null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
        <FolderIcon className="size-4 text-neutral-500 shrink-0" />
        <button
          onClick={handleOpenPath}
          className="flex-1 text-left text-sm text-neutral-600 truncate min-w-0 hover:underline"
        >
          {vaultBase ?? "Loading..."}
        </button>
        <button
          onClick={handleChange}
          disabled={changeMutation.isPending}
          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors shrink-0"
        >
          Change
        </button>
        <button
          onClick={onContinue}
          className="px-3 py-1 text-sm rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white font-medium duration-150 hover:scale-[1.01] active:scale-[0.99] shrink-0"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
