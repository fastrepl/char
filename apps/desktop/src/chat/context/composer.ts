import type { ContextEntity } from "../context-item";

export function composeContextEntities(
  groups: ContextEntity[][],
): ContextEntity[] {
  const seen = new Set<string>();
  const merged: ContextEntity[] = [];

  for (const group of groups) {
    for (const entity of group) {
      if (seen.has(entity.key)) continue;
      seen.add(entity.key);
      merged.push(entity);
    }
  }

  return merged;
}
