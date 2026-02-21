export type {
  AgentMessage,
  Contact,
  Conversation,
  CreateContactRequest,
  CreateConversationRequest,
  FetchFn,
  HelpChatConfig,
  Message,
  SendMessageRequest,
} from "./types";

export {
  createContact,
  createConversation,
  getMessages,
  listConversations,
  sendMessage,
} from "./client";

export { connectEventStream } from "./events";
export type { EventStreamOptions } from "./events";
