import { useCallback, useEffect, useRef, useState } from "react";

import {
  createNewConversation,
  createOrFindContact,
  fetchConversations,
  fetchMessages,
  persistMessage,
} from "./client";
import { connectEventStream } from "./events";
import type {
  AgentMessage,
  ChatwootContact,
  ChatwootMessage,
  ContactInfo,
  HelpChatConfig,
} from "./types";

export interface UseChatwootContactOptions {
  config: HelpChatConfig;
  userId: string | undefined;
  contactInfo?: ContactInfo;
}

export function useChatwootContact(options: UseChatwootContactOptions) {
  const { config, userId, contactInfo } = options;
  const [contact, setContact] = useState<ChatwootContact | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!userId || initRef.current) {
      return;
    }
    initRef.current = true;

    createOrFindContact(config, userId, contactInfo).then((result) => {
      if (result) {
        setContact(result);
      }
    });
  }, [config, userId, contactInfo]);

  return contact;
}

export interface UseConversationOptions {
  config: HelpChatConfig;
  contact: ChatwootContact | null;
  autoResume?: boolean;
}

export interface ConversationHandle {
  conversationId: number | null;
  isReady: boolean;
  history: ChatwootMessage[];
  startConversation: () => Promise<number | null>;
  resumeLatest: () => Promise<number | null>;
  persistUserMessage: (content: string) => Promise<void>;
  persistAgentMessage: (content: string) => Promise<void>;
}

export function useConversation(
  options: UseConversationOptions,
): ConversationHandle {
  const { config, contact, autoResume = true } = options;
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [history, setHistory] = useState<ChatwootMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const conversationIdRef = useRef<number | null>(null);
  const resumeAttemptedRef = useRef(false);

  useEffect(() => {
    if (!contact || resumeAttemptedRef.current) {
      if (!contact) {
        setIsReady(false);
      }
      return;
    }
    resumeAttemptedRef.current = true;

    if (!autoResume) {
      setIsReady(true);
      return;
    }

    (async () => {
      try {
        const conversations = await fetchConversations(
          config,
          contact.sourceId,
        );
        if (conversations.length > 0) {
          const latest = conversations[0];
          conversationIdRef.current = latest.id;
          setConversationId(latest.id);

          const messages = await fetchMessages(
            config,
            latest.id,
            contact.sourceId,
          );
          setHistory(messages);
        }
      } catch (e) {
        console.error("Failed to resume conversation:", e);
      } finally {
        setIsReady(true);
      }
    })();
  }, [config, contact, autoResume]);

  const startConversation = useCallback(async () => {
    if (!contact) {
      return null;
    }

    const convId = await createNewConversation(config, contact.sourceId);
    if (convId != null) {
      conversationIdRef.current = convId;
      setConversationId(convId);
      setHistory([]);
    }
    return convId;
  }, [config, contact]);

  const resumeLatest = useCallback(async () => {
    if (!contact) {
      return null;
    }

    const conversations = await fetchConversations(config, contact.sourceId);
    if (conversations.length > 0) {
      const latest = conversations[0];
      conversationIdRef.current = latest.id;
      setConversationId(latest.id);

      const messages = await fetchMessages(
        config,
        latest.id,
        contact.sourceId,
      );
      setHistory(messages);
      return latest.id;
    }
    return null;
  }, [config, contact]);

  const persistUserMessage = useCallback(
    async (content: string) => {
      const convId = conversationIdRef.current;
      if (convId == null || !contact) {
        return;
      }
      await persistMessage(config, convId, contact.sourceId, content, "incoming");
    },
    [config, contact],
  );

  const persistAgentMessage = useCallback(
    async (content: string) => {
      const convId = conversationIdRef.current;
      if (convId == null || !contact) {
        return;
      }
      await persistMessage(config, convId, contact.sourceId, content, "outgoing");
    },
    [config, contact],
  );

  return {
    conversationId,
    isReady,
    history,
    startConversation,
    resumeLatest,
    persistUserMessage,
    persistAgentMessage,
  };
}

export interface UseAgentEventsOptions {
  config: HelpChatConfig;
  pubsubToken: string | null;
  conversationId: number | null;
  onAgentMessage: (message: AgentMessage) => void;
}

export function useAgentEvents(options: UseAgentEventsOptions) {
  const { config, pubsubToken, conversationId, onAgentMessage } = options;
  const onAgentMessageRef = useRef(onAgentMessage);
  onAgentMessageRef.current = onAgentMessage;

  useEffect(() => {
    if (!pubsubToken || conversationId == null || !config.accessToken) {
      return;
    }

    const abortController = new AbortController();

    connectEventStream({
      config,
      conversationId,
      pubsubToken,
      onAgentMessage: (msg) => onAgentMessageRef.current(msg),
      signal: abortController.signal,
    }).catch((e) => {
      if (!abortController.signal.aborted) {
        console.error("Chatwoot events stream error:", e);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [config, pubsubToken, conversationId]);
}

export interface UseHelpChatOptions {
  config: HelpChatConfig;
  userId: string | undefined;
  contactInfo?: ContactInfo;
  autoResume?: boolean;
  onHumanAgentMessage?: (message: AgentMessage) => void;
}

export interface HelpChatHandle {
  isReady: boolean;
  conversationId: number | null;
  history: ChatwootMessage[];
  startConversation: () => Promise<number | null>;
  resumeLatest: () => Promise<number | null>;
  persistUserMessage: (content: string) => Promise<void>;
  persistAgentMessage: (content: string) => Promise<void>;
}

export function useHelpChat(options: UseHelpChatOptions): HelpChatHandle {
  const { config, userId, contactInfo, autoResume, onHumanAgentMessage } =
    options;

  const contact = useChatwootContact({ config, userId, contactInfo });

  const conversation = useConversation({
    config,
    contact,
    autoResume,
  });

  const noopHandler = useCallback(() => {}, []);

  useAgentEvents({
    config,
    pubsubToken: contact?.pubsubToken ?? null,
    conversationId: conversation.conversationId,
    onAgentMessage: onHumanAgentMessage ?? noopHandler,
  });

  return {
    isReady: conversation.isReady,
    conversationId: conversation.conversationId,
    history: conversation.history,
    startConversation: conversation.startConversation,
    resumeLatest: conversation.resumeLatest,
    persistUserMessage: conversation.persistUserMessage,
    persistAgentMessage: conversation.persistAgentMessage,
  };
}
