import { createMarkdownDirPersister } from "~/store/tinybase/persister/factories";
import type { Store } from "~/store/tinybase/store/main";

import type { PromptStorage } from "@hypr/store";
import type { Schemas } from "@hypr/store";

import { parsePromptIdFromPath } from "./changes";
import { frontmatterToPrompt, promptToFrontmatter } from "./transform";

export function createPromptPersister(store: Store) {
  return createMarkdownDirPersister<Schemas, PromptStorage>(store, {
    tableName: "prompts",
    dirName: "prompts",
    label: "PromptPersister",
    entityParser: parsePromptIdFromPath,
    toFrontmatter: promptToFrontmatter,
    fromFrontmatter: frontmatterToPrompt,
  });
}
