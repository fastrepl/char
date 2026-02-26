import { faker } from "@faker-js/faker/locale/en";
import { DEFAULT_USER_ID, id } from "~/shared/utils";

import type { TemplateSection, TemplateStorage } from "@hypr/store";

export const createTemplate = (): { id: string; data: TemplateStorage } => {
  const sectionCount = faker.number.int({ min: 2, max: 5 });
  const sections: TemplateSection[] = Array.from(
    { length: sectionCount },
    () => ({
      title: faker.lorem.words({ min: 2, max: 4 }),
      description: faker.lorem.sentence(),
    }),
  );

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      title: faker.lorem.words({ min: 2, max: 5 }),
      description: faker.lorem.sentence(),
      sections: JSON.stringify(sections),
    },
  };
};
