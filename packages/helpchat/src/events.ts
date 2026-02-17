import type { AgentMessage, FetchFn, HelpChatConfig } from "./types";

export interface EventStreamOptions {
  config: HelpChatConfig;
  conversationId: number;
  pubsubToken: string;
  onMessage: (message: AgentMessage) => void;
  signal?: AbortSignal;
}

/**
 * Connect to the SSE event stream for real-time human agent messages.
 *
 * The backend proxies Chatwoot's ActionCable WebSocket into a plain SSE
 * stream at `/support/chatwoot/conversations/{id}/events`.
 *
 * Resolves when the stream ends; rejects on connection error.
 */
export async function connectEventStream(
  options: EventStreamOptions,
): Promise<void> {
  const { config, conversationId, pubsubToken, onMessage, signal } = options;

  const fetchFn: FetchFn = config.fetchFn ?? globalThis.fetch;

  const params = new URLSearchParams({ pubsub_token: pubsubToken });
  const url = `${config.baseUrl}/support/chatwoot/conversations/${conversationId}/events?${params}`;

  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (config.accessToken) {
    headers["Authorization"] = `Bearer ${config.accessToken}`;
  }

  const res = await fetchFn(url, { method: "GET", headers, signal });

  if (!res.ok || !res.body) {
    throw new Error(`event stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
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
        const payload = JSON.parse(dataLine.slice(6)) as AgentMessage;
        if (payload.content) {
          onMessage(payload);
        }
      } catch {
        // skip malformed SSE frames
      }
    }
  }
}
