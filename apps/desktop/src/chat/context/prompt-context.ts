import type { SessionContext } from "@hypr/plugin-template";

import type { ContextEntity } from "../context-item";

export function getPersistableContextEntities(
  entities: ContextEntity[],
): ContextEntity[] {
  return entities.filter((entity) => entity.source !== "tool");
}

function formatSessionContext(ctx: SessionContext): string {
  const lines: string[] = [];

  lines.push(`## ${ctx.title ?? "Untitled"}`);

  if (ctx.date) {
    lines.push(`Date: ${ctx.date}`);
  }

  if (ctx.participants && ctx.participants.length > 0) {
    const names = ctx.participants
      .map((p) => (p.jobTitle ? `${p.name} (${p.jobTitle})` : p.name))
      .join(", ");
    lines.push(`Participants: ${names}`);
  }

  if (ctx.event?.name) {
    lines.push(`Meeting: ${ctx.event.name}`);
  }

  const content = ctx.enhancedContent ?? ctx.rawContent;
  if (content) {
    lines.push("", "### Summary", content);
  }

  if (ctx.transcript && ctx.transcript.segments.length > 0) {
    lines.push("", "### Transcript");
    for (const segment of ctx.transcript.segments) {
      lines.push(`${segment.speaker}: ${segment.text}`);
    }
  }

  return lines.join("\n");
}

export function buildContextBlock(entities: ContextEntity[]): string | null {
  const sessionEntities = entities.filter(
    (entity): entity is Extract<ContextEntity, { kind: "session" }> =>
      entity.kind === "session" && entity.source !== "tool",
  );

  if (sessionEntities.length === 0) {
    return null;
  }

  return sessionEntities
    .map((entity) => formatSessionContext(entity.sessionContext))
    .join("\n\n---\n\n");
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
