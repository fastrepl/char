export type {
  AgentMessage,
  ChatwootContact,
  ChatwootConversation,
  ChatwootMessage,
  ContactInfo,
  FetchFn,
  HelpChatConfig,
} from "./types";

export {
  buildEventsUrl,
  createNewConversation,
  createOrFindContact,
  fetchConversations,
  fetchMessages,
  persistMessage,
} from "./client";

export { connectEventStream } from "./events";
export type { EventStreamOptions } from "./events";

export {
  useAgentEvents,
  useChatwootContact,
  useConversation,
  useHelpChat,
} from "./hooks";
export type {
  ConversationHandle,
  HelpChatHandle,
  UseAgentEventsOptions,
  UseChatwootContactOptions,
  UseConversationOptions,
  UseHelpChatOptions,
} from "./hooks";
