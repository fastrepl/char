import type {
  Contact,
  Conversation,
  CreateContactRequest,
  CreateConversationRequest,
  FetchFn,
  HelpChatConfig,
  Message,
  SendMessageRequest,
} from "./types";

function resolveFetch(config: HelpChatConfig): FetchFn {
  return config.fetchFn ?? globalThis.fetch;
}

function authHeaders(config: HelpChatConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.accessToken) {
    headers["Authorization"] = `Bearer ${config.accessToken}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function createContact(
  config: HelpChatConfig,
  req: CreateContactRequest,
): Promise<Contact> {
  const fetchFn = resolveFetch(config);
  const res = await fetchFn(`${config.baseUrl}/support/chatwoot/contact`, {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`createContact failed: ${res.status}`);
  }
  return res.json() as Promise<Contact>;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function createConversation(
  config: HelpChatConfig,
  req: CreateConversationRequest,
): Promise<{ conversationId: number }> {
  const fetchFn = resolveFetch(config);
  const res = await fetchFn(
    `${config.baseUrl}/support/chatwoot/conversations`,
    {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) {
    throw new Error(`createConversation failed: ${res.status}`);
  }
  return res.json() as Promise<{ conversationId: number }>;
}

export async function listConversations(
  config: HelpChatConfig,
  sourceId: string,
): Promise<Conversation[]> {
  const fetchFn = resolveFetch(config);
  const params = new URLSearchParams({ source_id: sourceId });
  const res = await fetchFn(
    `${config.baseUrl}/support/chatwoot/conversations?${params}`,
    {
      method: "GET",
      headers: authHeaders(config),
    },
  );
  if (!res.ok) {
    throw new Error(`listConversations failed: ${res.status}`);
  }
  return res.json() as Promise<Conversation[]>;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function sendMessage(
  config: HelpChatConfig,
  conversationId: number,
  req: SendMessageRequest,
): Promise<Message> {
  const fetchFn = resolveFetch(config);
  const res = await fetchFn(
    `${config.baseUrl}/support/chatwoot/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) {
    throw new Error(`sendMessage failed: ${res.status}`);
  }
  return res.json() as Promise<Message>;
}

export async function getMessages(
  config: HelpChatConfig,
  conversationId: number,
  sourceId: string,
): Promise<Message[]> {
  const fetchFn = resolveFetch(config);
  const params = new URLSearchParams({ source_id: sourceId });
  const res = await fetchFn(
    `${config.baseUrl}/support/chatwoot/conversations/${conversationId}/messages?${params}`,
    {
      method: "GET",
      headers: authHeaders(config),
    },
  );
  if (!res.ok) {
    throw new Error(`getMessages failed: ${res.status}`);
  }
  return res.json() as Promise<Message[]>;
}
