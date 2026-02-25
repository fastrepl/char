import {
  type ChatTransport,
  convertToModelMessages,
  type LanguageModel,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from "ai";

import type { HyprUIMessage } from "./types";
import { isRecord } from "./utils";

const MAX_TOOL_STEPS = 5;
const MESSAGE_WINDOW_THRESHOLD = 20;
const MESSAGE_WINDOW_SIZE = 10;

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(
    private model: LanguageModel,
    private tools: ToolSet,
    private systemPrompt?: string,
  ) {}

  private createAgent(tools: ToolSet) {
    return new ToolLoopAgent({
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
  }

  private toUIStream(
    result: Awaited<ReturnType<ToolLoopAgent["stream"]>>,
    options: Parameters<ChatTransport<HyprUIMessage>["sendMessages"]>[0],
  ) {
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
  }

  sendMessages: ChatTransport<HyprUIMessage>["sendMessages"] = async (
    options,
  ) => {
    const messages = await convertToModelMessages(options.messages);
    const hasTools = Object.keys(this.tools).length > 0;

    try {
      const agent = this.createAgent(this.tools);
      const result = await agent.stream({ messages });
      return this.toUIStream(result, options);
    } catch (error) {
      if (hasTools) {
        console.warn(
          "[CustomChatTransport] Request with tools failed, retrying without tools:",
          error,
        );
        const agent = this.createAgent({});
        const result = await agent.stream({ messages });
        return this.toUIStream(result, options);
      }
      throw error;
    }
  };

  reconnectToStream: ChatTransport<HyprUIMessage>["reconnectToStream"] =
    async () => {
      return null;
    };
}
