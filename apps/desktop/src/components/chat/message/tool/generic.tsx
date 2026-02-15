import { WrenchIcon } from "lucide-react";

import { extractMcpOutputText } from "../../../../chat/mcp-utils";
import { Disclosure } from "../shared";
import {
  ToolCard,
  ToolCardApproval,
  ToolCardBody,
  ToolCardHeader,
  useToolApproval,
  useToolState,
} from "./shared";

function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatOutputText(output: unknown): string | null {
  const mcpText = extractMcpOutputText(output);
  if (mcpText) {
    return mcpText;
  }

  if (typeof output === "string") {
    return output;
  }

  if (output === null || output === undefined) {
    return null;
  }

  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function ToolGeneric({ part }: { part: Record<string, unknown> }) {
  const toolName = String(
    part.toolName ??
      (typeof part.type === "string" ? part.type.replace("tool-", "") : "tool"),
  );
  const { running, failed } = useToolState(part as { state: string });
  const done = (part.state as string) === "output-available";
  const awaitingApproval = useToolApproval(running);

  if (awaitingApproval) {
    return (
      <ToolCard>
        <ToolCardHeader
          icon={<WrenchIcon />}
          running={running}
          awaitingApproval
          failed={false}
          done={false}
          label={`${formatToolName(toolName)} — review needed`}
        />
        {part.input ? (
          <ToolCardBody>
            <InputDisplay input={part.input} />
          </ToolCardBody>
        ) : null}
        <ToolCardApproval />
      </ToolCard>
    );
  }

  if (done || failed) {
    const outputText = done ? formatOutputText(part.output) : null;

    return (
      <Disclosure
        icon={<WrenchIcon className="w-3 h-3" />}
        title={
          failed
            ? `${formatToolName(toolName)} failed`
            : formatToolName(toolName)
        }
      >
        <div className="flex flex-col gap-2">
          <InputDisplay input={part.input} />
          {failed ? (
            <p className="text-xs text-red-500">
              {String(part.errorText ?? "Unknown error")}
            </p>
          ) : null}
          {outputText ? (
            <p className="text-xs text-neutral-600 whitespace-pre-wrap">
              {outputText}
            </p>
          ) : null}
        </div>
      </Disclosure>
    );
  }

  return (
    <Disclosure
      icon={<WrenchIcon className="w-3 h-3" />}
      title={`Running ${formatToolName(toolName)}…`}
      disabled
    >
      {null}
    </Disclosure>
  );
}

function InputDisplay({ input }: { input: unknown }) {
  if (!input || typeof input !== "object") return null;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) return null;

  return (
    <dl className="text-xs text-neutral-500 flex flex-col gap-1">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="font-medium text-neutral-600 inline">{key}: </dt>
          <dd className="inline whitespace-pre-wrap wrap-break-word">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
