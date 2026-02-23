import type { SpeakerHintStorage, WordStorage } from "@hypr/store";

export type WordWithId = WordStorage & {
  id: string;
  state?: "final" | "pending";
};
export type SpeakerHintWithId = SpeakerHintStorage & { id: string };
