import { Check, Code2, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function GithubEmbed({
  code,
  fileName,
  url,
  startLine = 1,
  language: _language = "bash",
  highlightedHtml,
}: {
  code: string;
  fileName: string;
  url?: string;
  startLine?: number;
  language?: string;
  highlightedHtml?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [collapsedLines, setCollapsedLines] = useState<Set<number>>(new Set());

  const highlightedLines = useMemo(() => {
    if (!highlightedHtml) return null;
    const lineMatches = [
      ...highlightedHtml.matchAll(/<span class="line">(.*)<\/span>/g),
    ];
    return lineMatches.map((m) => m[1]);
  }, [highlightedHtml]);

  const lines = code.split("\n");

  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  const indentSize = useMemo(() => {
    for (const line of lines) {
      const match = line.match(/^( +)\S/);
      if (match) return match[1].length <= 4 ? match[1].length : 4;
    }
    return 4;
  }, [lines]);

  const indentLevels = useMemo(() => {
    const levels = lines.map((line) => {
      if (line.trim() === "") return -1;
      const match = line.match(/^( *)/);
      const spaces = match ? match[1].length : 0;
      return Math.floor(spaces / indentSize);
    });
    for (let i = 0; i < levels.length; i++) {
      if (levels[i] === -1) {
        levels[i] = i > 0 ? levels[i - 1] : 0;
      }
    }
    return levels;
  }, [lines, indentSize]);

  const foldRegions = useMemo(() => {
    const regions = new Map<number, number>();
    for (let i = 0; i < lines.length; i++) {
      if (i + 1 < lines.length && indentLevels[i + 1] > indentLevels[i]) {
        const baseLevel = indentLevels[i];
        let end = i + 1;
        while (end + 1 < lines.length && indentLevels[end + 1] > baseLevel) {
          end++;
        }
        regions.set(i, end);
      }
    }
    return regions;
  }, [lines, indentLevels]);

  const isLineVisible = useCallback(
    (index: number): boolean => {
      for (const [start, end] of foldRegions) {
        if (collapsedLines.has(start) && index > start && index <= end) {
          return false;
        }
      }
      return true;
    },
    [foldRegions, collapsedLines],
  );

  const toggleFold = useCallback((lineIndex: number) => {
    setCollapsedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) next.delete(lineIndex);
      else next.add(lineIndex);
      return next;
    });
  }, []);

  const rawUrl = url
    ?.replace("github.com", "raw.githubusercontent.com")
    .replace("/blob/", "/")
    .replace(/#L\d+(-L\d+)?$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTooltipOpen(true);
    setTimeout(() => {
      setCopied(false);
      setTooltipOpen(false);
    }, 2000);
  };

  const fileNameEl = url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-mono text-blue-600 hover:underline"
    >
      {fileName}
    </a>
  ) : (
    <span className="text-xs font-mono text-stone-600">{fileName}</span>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="border border-neutral-200 rounded-md overflow-hidden bg-stone-50 my-4">
        <div className="flex items-center justify-between pl-3 pr-2 py-2 bg-stone-100 border-b border-neutral-200">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-stone-500 shrink-0" />
            {fileNameEl}
          </div>
          <div className="flex items-center gap-1">
            {rawUrl && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center rounded px-2 py-1 text-xs font-mono text-stone-600 hover:bg-stone-200/80 transition-colors"
              >
                Raw
              </a>
            )}
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
                  className="cursor-pointer flex items-center gap-1.5 rounded p-1 text-xs hover:bg-stone-200/80 text-stone-600 transition-all"
                  aria-label={copied ? "Copied" : "Copy code"}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white rounded-md">
                {copied ? "Copied" : "Copy"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full border-collapse my-0!">
            <tbody>
              {lines.map((line, index) => {
                if (!isLineVisible(index)) return null;
                const isFoldable = foldRegions.has(index);
                const isCollapsed = collapsedLines.has(index);

                return (
                  <tr key={index} className="leading-5 border-0">
                    <td className="select-none pr-2 pl-2 py-0.5 text-stone-400 text-sm font-mono bg-stone-50 w-[1%] whitespace-nowrap border-r border-neutral-200 border-y-0">
                      <div className="flex items-center justify-end">
                        <span className="w-4 flex items-center justify-center shrink-0 text-xs">
                          {isFoldable && (
                            <button
                              type="button"
                              onClick={() => toggleFold(index)}
                              className="text-stone-400 hover:text-stone-600 cursor-pointer leading-none"
                            >
                              {isCollapsed ? "▸" : "▾"}
                            </button>
                          )}
                        </span>
                        <span className="text-right">{startLine + index}</span>
                      </div>
                    </td>
                    <td className="pr-4 py-0.5 text-sm font-mono whitespace-pre relative border-0">
                      {Array.from({ length: indentLevels[index] }, (_, i) => (
                        <span
                          key={i}
                          className="absolute top-0 bottom-0 border-l border-neutral-200"
                          style={{
                            left: `calc(1rem + ${i * indentSize}ch + 1ch)`,
                          }}
                        />
                      ))}
                      {highlightedLines?.[index] != null ? (
                        <span
                          className="pl-4"
                          dangerouslySetInnerHTML={{
                            __html: highlightedLines[index] || " ",
                          }}
                        />
                      ) : (
                        <span className="pl-4 text-stone-700">
                          {line || " "}
                        </span>
                      )}
                      {isCollapsed && (
                        <span className="ml-2 text-xs bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded border border-stone-200 align-middle">
                          ⋯
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
