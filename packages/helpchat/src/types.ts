/** Custom fetch function signature for platform-agnostic HTTP. */
export type FetchFn = typeof globalThis.fetch;

/** Configuration for connecting to the helpchat backend. */
export interface HelpChatConfig {
  /** Base URL of the support API (e.g. "https://api.example.com"). */
  baseUrl: string;
  /** Optional auth token included as Bearer header. */
  accessToken?: string | null;
  /** Optional custom fetch implementation (e.g. Tauri HTTP plugin). */
  fetchFn?: FetchFn;
}

// ---------------------------------------------------------------------------
// Request / Response shapes (mirror crates/api-support/src/routes/chatwoot/)
// ---------------------------------------------------------------------------

export interface CreateContactRequest {
  identifier: string;
  name?: string;
  email?: string;
  customAttributes?: Record<string, unknown>;
}

export interface Contact {
  sourceId: string;
  pubsubToken: string;
}

export interface CreateConversationRequest {
  sourceId: string;
  customAttributes?: Record<string, unknown>;
}

export interface Conversation {
  id: number;
  inboxId: string | null;
}

export interface SendMessageRequest {
  content: string;
  messageType?: "incoming" | "outgoing";
  sourceId?: string;
}

export interface Message {
  id: string;
  content: string | null;
  messageType: string | null;
  createdAt: string | null;
}

export interface AgentMessage {
  content: string;
  senderName: string;
}
