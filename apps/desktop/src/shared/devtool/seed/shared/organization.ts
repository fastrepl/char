import { faker } from "@faker-js/faker/locale/en";

import type { Organization } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "~/shared/utils";

export const createOrganization = () => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    name: faker.company.name(),
    pinned: false,
  } satisfies Organization,
});
