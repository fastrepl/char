import {
  type ChatTransport,
  convertToModelMessages,
  type LanguageModel,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from "ai";

import {
  type SessionContext,
  commands as templateCommands,
} from "@hypr/plugin-template";

import type { ContextRef } from "./context/entities";
import type { HyprUIMessage } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const MAX_TOOL_STEPS = 5;
const MESSAGE_WINDOW_THRESHOLD = 20;
const MESSAGE_WINDOW_SIZE = 10;

function isContextRef(value: unknown): value is ContextRef {
  return (
    isRecord(value) &&
    value.kind === "session" &&
    typeof value.key === "string" &&
    typeof value.sessionId === "string" &&
    (value.source === undefined ||
      value.source === "tool" ||
      value.source === "manual" ||
      value.source === "auto-current")
  );
}

function getContextRefs(metadata: unknown): ContextRef[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.contextRefs)) {
    return [];
  }

  return metadata.contextRefs.filter((ref): ref is ContextRef =>
    isContextRef(ref),
  );
}

function getSessionIdsFromSearchOutput(output: unknown): string[] {
  if (!isRecord(output) || !Array.isArray(output.results)) {
    return [];
  }
  return output.results.flatMap((item) => {
    if (
      !isRecord(item) ||
      (typeof item.id !== "string" && typeof item.id !== "number")
    ) {
      return [];
    }
    return [String(item.id)];
  });
}

type ToolOutputPart = {
  type: `tool-${string}`;
  state: "output-available";
  output?: unknown;
  [key: string]: unknown;
};

function isToolOutputPart(value: unknown): value is ToolOutputPart {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    value.type.startsWith("tool-") &&
    value.state === "output-available"
  );
}

function hasContextText(output: unknown): boolean {
  return (
    isRecord(output) &&
    typeof output.contextText === "string" &&
    output.contextText.length > 0
  );
}

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(
    private model: LanguageModel,
    private tools: ToolSet,
    private systemPrompt?: string,
    private resolveContextRef?: (
      ref: ContextRef,
    ) => Promise<SessionContext | null>,
  ) {}

  private async renderContextBlock(
    contextRefs: ContextRef[],
    cache: Map<string, string | null>,
  ): Promise<string | null> {
    if (!this.resolveContextRef || contextRefs.length === 0) {
      return null;
    }

    const cacheKey = JSON.stringify(contextRefs);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey) ?? null;
    }

    const seen = new Set<string>();
    const contexts: SessionContext[] = [];
    for (const ref of contextRefs) {
      if (seen.has(ref.key)) continue;
      seen.add(ref.key);
      const context = await this.resolveContextRef(ref);
      if (context) contexts.push(context);
    }

    if (contexts.length === 0) {
      cache.set(cacheKey, null);
      return null;
    }

    const rendered = await templateCommands.render({
      contextBlock: { contexts },
    });
    const result = rendered.status === "ok" ? rendered.data : null;
    cache.set(cacheKey, result);
    return result;
  }

  private async expandSearchSessionsOutput(
    part: ToolOutputPart,
    cache: Map<string, string | null>,
  ): Promise<ToolOutputPart> {
    if (hasContextText(part.output)) {
      return part;
    }

    const sessionIds = getSessionIdsFromSearchOutput(part.output);
    if (sessionIds.length === 0) return part;

    const refs: ContextRef[] = sessionIds.map((sessionId) => ({
      kind: "session",
      key: `session:search:${sessionId}`,
      source: "tool",
      sessionId,
    }));

    const contextText = await this.renderContextBlock(refs, cache);
    if (!contextText) return part;

    return {
      ...part,
      output: {
        ...(isRecord(part.output) ? part.output : {}),
        contextText,
      },
    };
  }

  private buildHydratingToolSet(cache: Map<string, string | null>): ToolSet {
    const searchTool = this.tools.search_sessions;
    if (!searchTool || typeof searchTool !== "object") {
      return this.tools;
    }

    const execute = (
      searchTool as {
        execute?: (...args: unknown[]) => Promise<unknown>;
      }
    ).execute;
    if (typeof execute !== "function") {
      return this.tools;
    }

    return {
      ...this.tools,
      search_sessions: {
        ...searchTool,
        execute: async (...args: unknown[]) => {
          const output = await execute(...args);
          if (hasContextText(output)) {
            return output;
          }

          const sessionIds = getSessionIdsFromSearchOutput(output);
          if (sessionIds.length === 0) {
            return output;
          }

          const refs: ContextRef[] = sessionIds.map((sessionId) => ({
            kind: "session",
            key: `session:search:${sessionId}`,
            source: "tool",
            sessionId,
          }));

          const contextText = await this.renderContextBlock(refs, cache);
          if (!contextText) {
            return output;
          }

          return {
            ...(isRecord(output) ? output : {}),
            contextText,
          };
        },
      },
    };
  }

  sendMessages: ChatTransport<HyprUIMessage>["sendMessages"] = async (
    options,
  ) => {
    const cache = new Map<string, string | null>();
    const tools = this.buildHydratingToolSet(cache);

    const agent = new ToolLoopAgent({
      model: this.model,
      instructions: this.systemPrompt,
      tools,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      prepareStep: async ({ messages }) => {
        if (messages.length > MESSAGE_WINDOW_THRESHOLD) {
          return { messages: messages.slice(-MESSAGE_WINDOW_SIZE) };
        }
        return {};
      },
    });

    const messagesWithContext: HyprUIMessage[] = [];

    for (const msg of options.messages) {
      if (msg.role === "user") {
        const contextRefs = getContextRefs(msg.metadata);
        if (contextRefs.length === 0) {
          messagesWithContext.push(msg);
          continue;
        }

        const contextBlock = await this.renderContextBlock(contextRefs, cache);
        if (!contextBlock) {
          messagesWithContext.push(msg);
          continue;
        }

        messagesWithContext.push({
          ...msg,
          parts: [
            { type: "text" as const, text: `${contextBlock}\n\n` },
            ...msg.parts,
          ],
        });
      } else if (msg.role === "assistant") {
        const expandedParts = await Promise.all(
          msg.parts.map((part) => {
            if (
              isToolOutputPart(part) &&
              part.type === "tool-search_sessions"
            ) {
              return this.expandSearchSessionsOutput(part, cache);
            }
            return part;
          }),
        );
        messagesWithContext.push({
          ...msg,
          parts: expandedParts as HyprUIMessage["parts"],
        });
      } else {
        messagesWithContext.push(msg);
      }
    }

    const result = await agent.stream({
      messages: await convertToModelMessages(messagesWithContext),
    });

    return result.toUIMessageStream({
      originalMessages: options.messages,
      messageMetadata: ({ part }: { part: { type: string } }) => {
        if (part.type === "start") {
          return { createdAt: Date.now() };
        }
      },
      onError: (error: unknown) => {
        console.error(error);
        if (error instanceof Error) {
          return `${error.name}: ${error.message}`;
        }
        if (isRecord(error) && typeof error.message === "string") {
          return error.message;
        }
        try {
          return JSON.stringify(error);
        } catch {
          return String(error);
        }
      },
    });
  };

  reconnectToStream: ChatTransport<HyprUIMessage>["reconnectToStream"] =
    async () => {
      return null;
    };
}
