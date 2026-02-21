import { faker } from "@faker-js/faker/locale/en";

import type { SessionEvent, SessionStorage } from "@hypr/store";
import { md2json } from "@hypr/tiptap/shared";

import { DEFAULT_USER_ID, id } from "../../../../utils";

export const generateTitle = () => {
  const lengthConfig = faker.helpers.weightedArrayElement([
    { weight: 40, value: { min: 2, max: 4 } },
    { weight: 35, value: { min: 4, max: 6 } },
    { weight: 15, value: { min: 6, max: 9 } },
    { weight: 8, value: { min: 9, max: 12 } },
    { weight: 2, value: { min: 12, max: 15 } },
  ]);

  const wordCount = faker.number.int(lengthConfig);
  return faker.lorem.sentence(wordCount);
};

export const generateEnhancedMarkdown = () => {
  const sections: string[] = [];
  const sectionCount = faker.number.int({ min: 3, max: 8 });

  for (let i = 0; i < sectionCount; i++) {
    const current = [];
    const heading = faker.lorem.sentence({ min: 2, max: 5 });
    current.push(`## ${heading}`);

    const bulletCount = faker.number.int({ min: 2, max: 5 });
    const bullets = faker.helpers.multiple(
      () => `- ${faker.lorem.sentence()}`,
      {
        count: bulletCount,
      },
    );
    current.push(bullets.join("\n"));
    sections.push(current.join("\n"));
  }

  return `${sections.join("\n\n")}`;
};

export const createSession = (
  event?: SessionEvent,
  folderId?: string,
): { id: string; data: SessionStorage } => {
  const title = generateTitle();
  const raw_md = faker.lorem.paragraphs(
    faker.number.int({ min: 2, max: 5 }),
    "\n\n",
  );

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      title,
      raw_md: JSON.stringify(md2json(raw_md)),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      event_json: event ? JSON.stringify(event) : undefined,
      folder_id: folderId,
    },
  };
};
