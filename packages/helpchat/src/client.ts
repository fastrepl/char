import {
  createContact as apiCreateContact,
  createConversation as apiCreateConversation,
  getMessages as apiGetMessages,
  listConversations as apiListConversations,
  sendMessage as apiSendMessage,
} from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";

import type {
  ChatwootContact,
  ChatwootConversation,
  ChatwootMessage,
  ContactInfo,
  HelpChatConfig,
} from "./types";

function makeClient(config: HelpChatConfig) {
  const headers: Record<string, string> = {};
  if (config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`;
  }
  return createClient({ baseUrl: config.apiBaseUrl, headers });
}

export async function createOrFindContact(
  config: HelpChatConfig,
  userId: string,
  contactInfo?: ContactInfo,
): Promise<ChatwootContact | null> {
  const client = makeClient(config);
  const { data } = await apiCreateContact({
    client,
    body: {
      identifier: userId,
      email: contactInfo?.email,
      name: contactInfo?.name,
      customAttributes: contactInfo?.customAttributes,
    },
  });

  if (data) {
    return {
      sourceId: data.sourceId,
      pubsubToken: data.pubsubToken,
    };
  }
  return null;
}

export async function fetchConversations(
  config: HelpChatConfig,
  sourceId: string,
): Promise<ChatwootConversation[]> {
  const client = makeClient(config);
  const { data } = await apiListConversations({
    client,
    query: { source_id: sourceId },
  });

  if (data) {
    return data.map((c) => ({
      id: c.id,
      inboxId: c.inboxId ?? null,
    }));
  }
  return [];
}

export async function createNewConversation(
  config: HelpChatConfig,
  sourceId: string,
): Promise<number | null> {
  const client = makeClient(config);
  const { data } = await apiCreateConversation({
    client,
    body: { sourceId },
  });

  return data?.conversationId ?? null;
}

export async function fetchMessages(
  config: HelpChatConfig,
  conversationId: number,
  sourceId: string,
): Promise<ChatwootMessage[]> {
  const client = makeClient(config);
  const { data } = await apiGetMessages({
    client,
    path: { conversation_id: conversationId },
    query: { source_id: sourceId },
  });

  if (data) {
    return data.map((m) => ({
      id: m.id,
      content: m.content ?? null,
      messageType: (m.messageType as "incoming" | "outgoing") ?? null,
      createdAt: m.createdAt ?? null,
    }));
  }
  return [];
}

export async function persistMessage(
  config: HelpChatConfig,
  conversationId: number,
  sourceId: string,
  content: string,
  messageType: "incoming" | "outgoing",
): Promise<void> {
  const client = makeClient(config);
  await apiSendMessage({
    client,
    path: { conversation_id: conversationId },
    body: {
      content,
      messageType,
      sourceId,
    },
  });
}

export function buildEventsUrl(
  config: HelpChatConfig,
  conversationId: number,
  pubsubToken: string,
): string {
  const client = makeClient(config);
  return client.buildUrl({
    url: "/support/chatwoot/conversations/{conversation_id}/events",
    path: { conversation_id: conversationId },
    query: { pubsub_token: pubsubToken },
  });
}
