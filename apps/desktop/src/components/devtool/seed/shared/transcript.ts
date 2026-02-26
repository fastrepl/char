import { faker } from "@faker-js/faker/locale/en";

import type { TranscriptStorage, WordStorage } from "@hypr/store";

import type { WordWithId } from "../../../../store/transcript/types";
import { DEFAULT_USER_ID, id } from "../../../../utils";

type TranscriptWithMetadata = {
  transcriptId: string;
  transcript: TranscriptStorage;
};

type TranscriptWordsOnly = {
  words: Array<WordStorage>;
};

const selectWeighted = <T,>(choices: Array<{ weight: number; value: T }>): T =>
  faker.helpers.weightedArrayElement(choices);

const appendPhrase = (target: string[], phrase: string) => {
  phrase
    .split(/\s+/)
    .filter(Boolean)
    .forEach((piece) => target.push(piece));
};

const sanitizeWord = (raw: string) =>
  raw.replace(/^[^A-Za-z0-9'-]+/, "").replace(/[^A-Za-z0-9'-]+$/, "");

const durationForWord = (text: string) => {
  const base = faker.number.int({ min: 110, max: 260 });
  const charBonus = Math.min(text.length * 32, 420);
  const variation = faker.number.int({ min: -35, max: 95 });
  return Math.max(80, base + charBonus + variation);
};

const generateSentence = () => {
  const starters = [
    "yeah",
    "so",
    "honestly",
    "right",
    "okay",
    "look",
    "listen",
    "alright",
  ];
  const bridges = [
    "you know",
    "I mean",
    "kind of",
    "sort of",
    "at the moment",
    "for example",
    "basically",
    "on our side",
  ];

  const sentenceWords: string[] = [];
  const isShort = faker.datatype.boolean({ probability: 0.3 });

  if (isShort) {
    const lengthRange = faker.number.int({ min: 3, max: 6 });
    appendPhrase(sentenceWords, faker.lorem.words(lengthRange));
  } else {
    if (faker.datatype.boolean({ probability: 0.5 })) {
      appendPhrase(sentenceWords, faker.helpers.arrayElement(starters));
    }

    const lengthRange = selectWeighted([
      { weight: 25, value: { min: 5, max: 9 } },
      { weight: 40, value: { min: 10, max: 15 } },
      { weight: 25, value: { min: 16, max: 22 } },
      { weight: 10, value: { min: 23, max: 30 } },
    ]);
    appendPhrase(
      sentenceWords,
      faker.lorem.words(faker.number.int(lengthRange)),
    );

    if (faker.datatype.boolean({ probability: 0.35 })) {
      appendPhrase(sentenceWords, faker.helpers.arrayElement(bridges));
      appendPhrase(
        sentenceWords,
        faker.lorem.words(faker.number.int({ min: 3, max: 8 })),
      );
    }
  }

  return sentenceWords;
};

export function generateTranscript(options: {
  turnCount?: { min: number; max: number };
  days?: number;
  sessionId: string;
}): TranscriptWithMetadata;
export function generateTranscript(options?: {
  turnCount?: { min: number; max: number };
  days?: number;
  sessionId?: undefined;
}): TranscriptWordsOnly;
export function generateTranscript(options?: {
  turnCount?: { min: number; max: number };
  days?: number;
  sessionId?: string;
}): TranscriptWithMetadata | TranscriptWordsOnly {
  const {
    turnCount: turnCountRange = { min: 200, max: 500 },
    days = 30,
    sessionId,
  } = options ?? {};

  const channelCount = 2;
  const turnCount = faker.number.int(turnCountRange);

  const transcriptId = id();
  const words: Array<WordStorage> = [];
  let currentTimeMs = 0;
  let currentChannel = 0;
  const createdAt = faker.date.recent({ days });
  const createdAtStr = createdAt.toISOString();
  const startedAt = createdAt.getTime();

  for (let turnIndex = 0; turnIndex < turnCount; turnIndex++) {
    const sentenceCount = selectWeighted([
      { weight: 20, value: 1 },
      { weight: 25, value: 2 },
      { weight: 20, value: 3 },
      { weight: 15, value: faker.number.int({ min: 4, max: 6 }) },
      { weight: 10, value: faker.number.int({ min: 7, max: 8 }) },
      { weight: 10, value: faker.number.int({ min: 9, max: 10 }) },
    ]);

    for (
      let sentenceIndex = 0;
      sentenceIndex < sentenceCount;
      sentenceIndex++
    ) {
      const sentenceWords = generateSentence();

      for (const raw of sentenceWords) {
        const text = sanitizeWord(raw);
        if (!text) {
          continue;
        }

        const start_ms = currentTimeMs;
        const durationMs = durationForWord(text);
        const end_ms = start_ms + durationMs;

        words.push({
          channel: currentChannel,
          text: ` ${text}`,
          start_ms,
          end_ms,
        });

        currentTimeMs = end_ms;
        currentTimeMs += faker.number.int({ min: 40, max: 120 });
      }

      if (sentenceIndex < sentenceCount - 1) {
        if (sentenceCount >= 4) {
          const sentenceGap = faker.number.int({
            min: 200,
            max: 800,
          });
          currentTimeMs += sentenceGap;
        } else if (sentenceCount >= 2) {
          if (faker.datatype.boolean({ probability: 0.5 })) {
            const sentenceGap = faker.number.int({
              min: 150,
              max: 600,
            });
            currentTimeMs += sentenceGap;
          }
        }
      }
    }

    currentTimeMs += faker.number.int({ min: 400, max: 1200 });

    if (faker.datatype.boolean({ probability: 0.2 })) {
      currentTimeMs += faker.number.int({ min: 1000, max: 2500 });
    }

    currentChannel = (currentChannel + 1) % channelCount;
  }

  if (sessionId) {
    const wordsWithIds: WordWithId[] = words.map((word) => ({
      ...word,
      id: id(),
    }));

    const transcript: TranscriptStorage = {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId,
      created_at: createdAtStr,
      started_at: startedAt,
      ended_at: startedAt + currentTimeMs,
      words: JSON.stringify(wordsWithIds),
      speaker_hints: "[]",
      memo_md: "",
    };

    return {
      transcriptId,
      transcript,
    };
  }

  return { words };
}
