import { createMarkdownDirPersister } from "~/store/tinybase/persister/factories";
import type { Store } from "~/store/tinybase/store/main";

import type { OrganizationStorage } from "@hypr/store";
import type { Schemas } from "@hypr/store";

import { parseOrganizationIdFromPath } from "./changes";
import {
  frontmatterToOrganization,
  organizationToFrontmatter,
} from "./transform";

export function createOrganizationPersister(store: Store) {
  return createMarkdownDirPersister<Schemas, OrganizationStorage>(store, {
    tableName: "organizations",
    dirName: "organizations",
    label: "OrganizationPersister",
    entityParser: parseOrganizationIdFromPath,
    toFrontmatter: organizationToFrontmatter,
    fromFrontmatter: frontmatterToOrganization,
  });
}
