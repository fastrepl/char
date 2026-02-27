import type { SeedDefinition } from "./shared";
import {
  bigWorkspaceSeed,
  curatedSeed,
  emptySeed,
  longSeed,
  randomSeed,
} from "./versions";

export { type SeedDefinition } from "./shared";

export const seeds: SeedDefinition[] = [
  emptySeed,
  randomSeed,
  longSeed,
  curatedSeed,
  bigWorkspaceSeed,
];
