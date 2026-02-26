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

import type { ContextRef } from "./context-item";
import type { HyprUIMessage } from "./types";
import { isRecord } from "./utils";

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
  ): Promise<string | null> {
    if (!this.resolveContextRef || contextRefs.length === 0) {
      return null;
    }

    const seen = new Set<string>();
    const contexts: SessionContext[] = [];
    for (const ref of contextRefs) {
      if (seen.has(ref.key)) {
        continue;
      }
      seen.add(ref.key);

      const context = await this.resolveContextRef(ref);
      if (context) {
        contexts.push(context);
      }
    }

    if (contexts.length === 0) {
      return null;
    }

    const rendered = await templateCommands.render({
      contextBlock: { contexts },
    });
    return rendered.status === "ok" ? rendered.data : null;
  }

  sendMessages: ChatTransport<HyprUIMessage>["sendMessages"] = async (
    options,
  ) => {
    const agent = new ToolLoopAgent({
      model: this.model,
      instructions: this.systemPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      prepareStep: async ({ messages }) => {
        if (messages.length > MESSAGE_WINDOW_THRESHOLD) {
          return { messages: messages.slice(-MESSAGE_WINDOW_SIZE) };
        }

        return {};
      },
    });

    const contextBlockCache = new Map<string, string | null>();
    const messagesWithContext: HyprUIMessage[] = [];
    for (const msg of options.messages) {
      if (msg.role !== "user") {
        messagesWithContext.push(msg);
        continue;
      }

      const contextRefs = getContextRefs(msg.metadata);
      if (contextRefs.length === 0) {
        messagesWithContext.push(msg);
        continue;
      }

      const cacheKey = JSON.stringify(contextRefs);
      let contextBlock = contextBlockCache.get(cacheKey);
      if (contextBlock === undefined) {
        contextBlock = await this.renderContextBlock(contextRefs);
        contextBlockCache.set(cacheKey, contextBlock);
      }

      if (!contextBlock) {
        messagesWithContext.push(msg);
        continue;
      }

      messagesWithContext.push({
        ...msg,
        parts: [
          {
            type: "text" as const,
            text: `${contextBlock}\n\n`,
          },
          ...msg.parts,
        ],
      });
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
