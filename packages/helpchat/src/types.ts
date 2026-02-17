export interface ChatwootContact {
  sourceId: string;
  pubsubToken: string;
}

export interface ChatwootMessage {
  id: string;
  content: string | null;
  messageType: "incoming" | "outgoing" | null;
  createdAt: string | null;
}

export interface ChatwootConversation {
  id: number;
  inboxId: string | null;
}

export interface AgentMessage {
  content: string;
  senderName: string;
}

export type FetchFn = typeof globalThis.fetch;

export interface HelpChatConfig {
  apiBaseUrl: string;
  accessToken?: string | null;
  fetchFn?: FetchFn;
}

export interface ContactInfo {
  email?: string;
  name?: string;
  customAttributes?: Record<string, unknown>;
}
