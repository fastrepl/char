import type { SessionContext } from "@hypr/plugin-template";

import {
  type ContextEntity,
  CURRENT_SESSION_CONTEXT_KEY,
} from "../context-item";

export type ChatSystemContext = {
  context: SessionContext | null;
};

export function getPersistableContextEntities(
  entities: ContextEntity[],
): ContextEntity[] {
  return entities.filter((entity) => entity.source !== "tool");
}

export function buildChatSystemContext(
  entities: ContextEntity[],
): ChatSystemContext {
  const sessionEntities = entities.filter(
    (entity): entity is Extract<ContextEntity, { kind: "session" }> =>
      entity.kind === "session",
  );
  const primary =
    sessionEntities.find(
      (entity) => entity.key === CURRENT_SESSION_CONTEXT_KEY,
    ) ?? sessionEntities[0];

  return {
    context: primary?.sessionContext ?? null,
  };
}

export function stableContextFingerprint(entities: ContextEntity[]): string {
  const serialize = (value: unknown): string => {
    if (Array.isArray(value)) {
      return `[${value.map((item) => serialize(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).sort(
        ([a], [b]) => a.localeCompare(b),
      );
      return `{${entries
        .map(([key, val]) => `${JSON.stringify(key)}:${serialize(val)}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  };

  return serialize(
    entities.map((entity) => ({
      kind: entity.kind,
      key: entity.key,
      source: entity.source ?? null,
      removable: "removable" in entity ? (entity.removable ?? false) : false,
      payload:
        entity.kind === "session"
          ? entity.sessionContext
          : entity.kind === "account"
            ? {
                userId: entity.userId ?? null,
                email: entity.email ?? null,
                fullName: entity.fullName ?? null,
                avatarUrl: entity.avatarUrl ?? null,
                stripeCustomerId: entity.stripeCustomerId ?? null,
              }
            : {
                platform: entity.platform ?? null,
                arch: entity.arch ?? null,
                osVersion: entity.osVersion ?? null,
                appVersion: entity.appVersion ?? null,
                buildHash: entity.buildHash ?? null,
                locale: entity.locale ?? null,
              },
    })),
  );
}
