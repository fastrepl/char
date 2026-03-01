import { faker } from "@faker-js/faker/locale/en";

import type { EnhancedNoteStorage } from "@hypr/store";
import { md2json } from "@hypr/tiptap/shared";

import { DEFAULT_USER_ID, id } from "~/shared/utils";

export const createEnhancedNote = (
  sessionId: string,
  position: number,
  templateId?: string,
): { id: string; data: EnhancedNoteStorage } => {
  const title = faker.lorem.sentence({ min: 2, max: 5 });
  const contentMarkdown = faker.lorem.paragraphs(
    faker.number.int({ min: 1, max: 3 }),
    "\n\n",
  );

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId,
      content: JSON.stringify(md2json(contentMarkdown)),
      position,
      template_id: templateId,
      title,
    },
  };
};
