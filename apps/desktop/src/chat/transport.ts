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

    const messagesWithContext = options.messages.map((msg) => {
      const contextBlock = (msg.metadata as { contextBlock?: string })
        ?.contextBlock;
      if (msg.role !== "user" || !contextBlock) {
        return msg;
      }
      return {
        ...msg,
        parts: [
          {
            type: "text" as const,
            text: `<context>\n${contextBlock}\n</context>\n\n`,
          },
          ...msg.parts,
        ],
      };
    });

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
