import { createMarkdownDirPersister } from "~/store/tinybase/persister/factories";
import type { Store } from "~/store/tinybase/store/main";

import type { HumanStorage } from "@hypr/store";
import type { Schemas } from "@hypr/store";

import { parseHumanIdFromPath } from "./changes";
import { frontmatterToHuman, humanToFrontmatter } from "./transform";

export function createHumanPersister(store: Store) {
  return createMarkdownDirPersister<Schemas, HumanStorage>(store, {
    tableName: "humans",
    dirName: "humans",
    label: "HumanPersister",
    entityParser: parseHumanIdFromPath,
    toFrontmatter: humanToFrontmatter,
    fromFrontmatter: frontmatterToHuman,
  });
}
