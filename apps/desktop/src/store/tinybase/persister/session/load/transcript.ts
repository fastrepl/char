import type { TranscriptJson } from "~/store/tinybase/persister/session/types";

import type { LoadedSessionData } from "./types";

const LABEL = "SessionPersister";

export function processTranscriptFile(
  path: string,
  content: string,
  result: LoadedSessionData,
): void {
  try {
    const data = JSON.parse(content) as TranscriptJson;

    for (const transcript of data.transcripts) {
      const { id, words, speaker_hints, ...transcriptData } = transcript;
      result.transcripts[id] = {
        ...transcriptData,
        words: JSON.stringify(words),
        speaker_hints: JSON.stringify(speaker_hints),
      };
    }
  } catch (error) {
    console.error(`[${LABEL}] Failed to load transcript from ${path}:`, error);
  }
}
