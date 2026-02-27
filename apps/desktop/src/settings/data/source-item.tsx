import { CheckIcon, Loader2Icon } from "lucide-react";

import { type ImportSourceInfo } from "@hypr/plugin-importer";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Button } from "@hypr/ui/components/ui/button";

export function SourceItem({
  source,
  onScan,
  disabled,
  isScanning,
  isSuccess,
}: {
  source: ImportSourceInfo;
  onScan: () => void;
  disabled: boolean;
  isScanning: boolean;
  isSuccess?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium mb-1">{source.name}</h3>
        <p className="text-xs text-neutral-600">
          Import data from `
          <button
            type="button"
            onClick={() => openerCommands.revealItemInDir(source.revealPath)}
            className="underline hover:text-neutral-900 cursor-pointer"
          >
            {source.path}
          </button>
          `
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onScan}
          disabled={disabled || isSuccess}
        >
          {isScanning ? (
            <>
              <Loader2Icon size={14} className="animate-spin mr-1" />
              Scanning...
            </>
          ) : isSuccess ? (
            <>
              <CheckIcon size={14} className="text-green-600 mr-1" />
            </>
          ) : (
            "Scan"
          )}
        </Button>
      </div>
    </div>
  );
}
