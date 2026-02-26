import {
  type ContextRef,
  CURRENT_SESSION_CONTEXT_KEY,
} from "~/chat/context-item";

export function getPersistableContextRefs(refs: ContextRef[]): ContextRef[] {
  return refs.filter(
    (ref) => ref.source !== "tool" && ref.key !== CURRENT_SESSION_CONTEXT_KEY,
  );
}

export function stableContextFingerprint(refs: ContextRef[]): string {
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
    refs.map((ref) => ({
      kind: ref.kind,
      key: ref.key,
      source: ref.source ?? null,
      sessionId: ref.sessionId,
    })),
  );
}
