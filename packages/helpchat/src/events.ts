import type { AgentMessage, FetchFn, HelpChatConfig } from "./types";
import { buildEventsUrl } from "./client";

export interface EventStreamOptions {
  config: HelpChatConfig;
  conversationId: number;
  pubsubToken: string;
  onAgentMessage: (message: AgentMessage) => void;
  signal?: AbortSignal;
}

export async function connectEventStream(
  options: EventStreamOptions,
): Promise<void> {
  const { config, conversationId, pubsubToken, onAgentMessage, signal } =
    options;

  const url = buildEventsUrl(config, conversationId, pubsubToken);
  const fetchFn: FetchFn = config.fetchFn ?? globalThis.fetch;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`;
  }

  const response = await fetchFn(url, {
    method: "GET",
    headers,
    signal,
  });

  if (!response.ok || !response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const dataLine = part
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (!dataLine) continue;

      try {
        const payload = JSON.parse(dataLine.slice(6)) as {
          content?: string;
          senderName?: string;
        };
        if (payload.content) {
          onAgentMessage({
            content: payload.content,
            senderName: payload.senderName ?? "Agent",
          });
        }
      } catch {
        // skip malformed SSE data
      }
    }
  }
}
