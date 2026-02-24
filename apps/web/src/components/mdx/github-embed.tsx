import { Check, Copy } from "lucide-react";
import { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function GithubEmbed({
  code,
  fileName,
  language: _language = "bash",
}: {
  code: string;
  fileName: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const lines = code.split("\n");

  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTooltipOpen(true);
    setTimeout(() => {
      setCopied(false);
      setTooltipOpen(false);
    }, 2000);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="border border-neutral-200 rounded-xs overflow-hidden bg-stone-50">
        <div className="flex items-center justify-between pl-3 pr-2 py-2 bg-stone-100 border-b border-neutral-200">
          <span className="text-xs font-mono text-stone-600">{fileName}</span>
          <Tooltip
            open={tooltipOpen}
            onOpenChange={(open) => {
              setTooltipOpen(open);
              if (!open) setCopied(false);
            }}
          >
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCopy}
                className="cursor-pointer flex items-center gap-1.5 rounded p-1 text-xs hover:bg-stone-300/80 text-stone-600 transition-all"
                aria-label={copied ? "Copied" : "Copy code"}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white rounded-md">
              {copied ? "Copied" : "Copy"}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full border-collapse my-0!">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="leading-5 hover:bg-stone-100/50">
                  <td className="select-none text-right pr-4 pl-4 py-0.5 text-stone-400 text-sm font-mono bg-stone-100/50 w-[1%] whitespace-nowrap border-r border-neutral-200">
                    {index + 1}
                  </td>
                  <td className="pl-4 pr-4 py-0.5 text-sm font-mono text-stone-700 whitespace-pre">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
