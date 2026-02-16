import { useCallback, useEffect, useRef, useState } from "react";

import {
  createContact,
  createConversation,
  getMessages,
  sendMessage,
} from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";

import { useAuth } from "../auth";
import { env } from "../env";

interface ChatwootState {
  sourceId: string | null;
  pubsubToken: string | null;
  conversationId: number | null;
}

function makeClient(accessToken?: string | null) {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return createClient({ baseUrl: env.VITE_API_URL, headers });
}

export function useChatwootPersistence(userId: string | undefined) {
  const { session } = useAuth();
  const [state, setState] = useState<ChatwootState>({
    sourceId: null,
    pubsubToken: null,
    conversationId: null,
  });
  const initRef = useRef(false);

  useEffect(() => {
    if (!userId || initRef.current) {
      return;
    }
    initRef.current = true;

    const client = makeClient(session?.access_token);

    createContact({
      client,
      body: { identifier: userId },
    }).then(({ data }) => {
      if (data) {
        setState((prev) => ({
          ...prev,
          sourceId: data.sourceId ?? null,
          pubsubToken: data.pubsubToken ?? null,
        }));
      }
    });
  }, [userId, session?.access_token]);

  const startConversation = useCallback(async () => {
    if (!state.sourceId) {
      return null;
    }

    const client = makeClient(session?.access_token);
    const { data } = await createConversation({
      client,
      body: { sourceId: state.sourceId },
    });

    if (data) {
      const convId = data.conversationId;
      setState((prev) => ({ ...prev, conversationId: convId }));
      return convId;
    }
    return null;
  }, [state.sourceId, session?.access_token]);

  const persistMessage = useCallback(
    async (content: string, messageType: "incoming" | "outgoing") => {
      const convId = state.conversationId;
      if (convId == null || !state.sourceId) {
        return;
      }

      const client = makeClient(session?.access_token);
      await sendMessage({
        client,
        path: { conversation_id: convId },
        body: {
          content,
          messageType,
          sourceId: state.sourceId,
        },
      });
    },
    [state.conversationId, state.sourceId, session?.access_token],
  );

  const loadMessages = useCallback(async () => {
    const convId = state.conversationId;
    if (convId == null || !state.sourceId) {
      return [];
    }

    const client = makeClient(session?.access_token);
    const { data } = await getMessages({
      client,
      path: { conversation_id: convId },
      query: { source_id: state.sourceId },
    });

    return data ?? [];
  }, [state.conversationId, state.sourceId, session?.access_token]);

  return {
    ...state,
    startConversation,
    persistMessage,
    loadMessages,
    isReady: !!state.sourceId,
  };
}
