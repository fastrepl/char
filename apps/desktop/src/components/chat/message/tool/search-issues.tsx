import { CircleDotIcon, SearchIcon } from "lucide-react";

import { cn } from "@hypr/utils";

import { parseSearchIssuesOutput } from "../../../../chat/support-mcp-tools";
import type { ToolRenderer } from "../types";
import {
  ToolCard,
  ToolCardBody,
  ToolCardFooters,
  ToolCardHeader,
  useMcpOutput,
  useToolState,
} from "./shared";

type Renderer = ToolRenderer<"tool-search_issues">;

function headerLabel(
  running: boolean,
  failed: boolean,
  query: string,
  parsed: ReturnType<typeof parseSearchIssuesOutput>,
): string {
  if (running) return `Searching issues: ${query}`;
  if (failed) return `Issue search failed: ${query}`;
  if (parsed)
    return `${parsed.total_results} issue${parsed.total_results === 1 ? "" : "s"} found`;
  return "Search issues";
}

export const ToolSearchIssues: Renderer = ({ part }) => {
  const { running, failed, done } = useToolState(part);
  const { parsed, rawText } = useMcpOutput(
    done,
    part.output,
    parseSearchIssuesOutput,
  );
  const query = part.input?.query ?? "";

  return (
    <ToolCard failed={failed}>
      <ToolCardHeader
        icon={<SearchIcon />}
        running={running}
        failed={failed}
        done={!!parsed}
        label={headerLabel(running, failed, query, parsed)}
      />

      {parsed && parsed.issues.length > 0 ? (
        <ToolCardBody>
          {parsed.issues.map((issue) => (
            <a
              key={issue.url}
              href={issue.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 rounded-md border border-neutral-200 p-2 hover:border-neutral-300 transition-colors"
            >
              <CircleDotIcon
                className={cn([
                  "w-3.5 h-3.5 mt-0.5 shrink-0",
                  issue.state.toLowerCase() === "open"
                    ? "text-emerald-500"
                    : "text-purple-500",
                ])}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-xs text-neutral-800 leading-snug">
                  {issue.title}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-neutral-500">
                    #{issue.number}
                  </span>
                  {issue.labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-1.5 py-0 text-[10px] text-neutral-500"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </ToolCardBody>
      ) : null}

      {parsed && parsed.issues.length === 0 ? (
        <ToolCardBody>
          <p className="text-xs text-neutral-500 text-center py-1">
            No issues found
          </p>
        </ToolCardBody>
      ) : null}

      <ToolCardFooters
        failed={failed}
        errorText={part.errorText}
        rawText={rawText}
      />
    </ToolCard>
  );
};
