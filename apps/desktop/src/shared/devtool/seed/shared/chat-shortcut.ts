import { faker } from "@faker-js/faker/locale/en";
import { DEFAULT_USER_ID, id } from "~/shared/utils";

import type { ChatShortcutStorage } from "@hypr/store";

export const createChatShortcut = (): {
  id: string;
  data: ChatShortcutStorage;
} => {
  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      title: faker.lorem.words({ min: 2, max: 4 }),
      content: faker.lorem.sentence({ min: 3, max: 8 }),
    },
  };
};
