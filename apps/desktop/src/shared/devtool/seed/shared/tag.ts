import { faker } from "@faker-js/faker/locale/en";
import { DEFAULT_USER_ID, id } from "~/shared/utils";

import type { Tag } from "@hypr/store";

export const createTag = () => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    name: faker.helpers.arrayElement([
      "Work",
      "Personal",
      "Meeting",
      "Project",
      "Research",
      "Important",
      "Follow-up",
      "Review",
    ]),
  } satisfies Tag,
});
