import { faker } from "@faker-js/faker/locale/en";

import type { ChatGroup, ChatMessageStorage } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "~/shared/utils";

export const createChatGroup = (): { id: string; data: ChatGroup } => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    title: faker.lorem.words({ min: 2, max: 5 }),
  },
});

export const createChatMessage = (
  chat_group_id: string,
  role: "user" | "assistant",
): { id: string; data: ChatMessageStorage } => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    chat_group_id,
    role,
    content: faker.lorem.sentences({ min: 1, max: 3 }),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    metadata: JSON.stringify({}),
    parts: JSON.stringify([]),
  },
});
