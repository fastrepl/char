import { faker } from "@faker-js/faker/locale/en";

import type {
  EventStorage,
  SessionStorage,
  TranscriptStorage,
} from "@hypr/store";

import { createSession, toSessionEvent } from "~/shared/devtool/seed/shared";
import { DEFAULT_USER_ID, id } from "~/shared/utils";
import type { WordWithId } from "~/stt/types";

export const buildSessionsForBigWorkspace = (
  count: number,
  options: {
    events?: Record<string, EventStorage>;
    eventLinkProbability?: number;
  } = {},
): Record<string, SessionStorage> => {
  const sessions: Record<string, SessionStorage> = {};
  const { events = {}, eventLinkProbability = 0.6 } = options;
  const eventEntries = Object.entries(events);

  for (let i = 0; i < count; i++) {
    const shouldLinkToEvent =
      eventEntries.length > 0 &&
      faker.datatype.boolean({ probability: eventLinkProbability });

    const sessionEvent = shouldLinkToEvent
      ? toSessionEvent(faker.helpers.arrayElement(eventEntries))
      : undefined;

    const session = createSession(sessionEvent, undefined);
    sessions[session.id] = session.data;
  }

  return sessions;
};

type PreGeneratedTurn = {
  words: Array<{ text: string; duration: number; gap: number }>;
  postTurnGap: number;
};

const generatePrecomputedTurnPool = (poolSize: number): PreGeneratedTurn[] => {
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

  const sanitizeWord = (raw: string) =>
    raw.replace(/^[^A-Za-z0-9'-]+/, "").replace(/[^A-Za-z0-9'-]+$/, "");

  const durationForWord = (text: string) => {
    const base = faker.number.int({ min: 110, max: 260 });
    const charBonus = Math.min(text.length * 32, 420);
    const variation = faker.number.int({ min: -35, max: 95 });
    return Math.max(80, base + charBonus + variation);
  };

  const pool: PreGeneratedTurn[] = [];

  for (let t = 0; t < poolSize; t++) {
    const turnWords: Array<{ text: string; duration: number; gap: number }> =
      [];

    const sentenceCount = faker.helpers.weightedArrayElement([
      { weight: 20, value: 1 },
      { weight: 25, value: 2 },
      { weight: 20, value: 3 },
      { weight: 15, value: faker.number.int({ min: 4, max: 6 }) },
      { weight: 10, value: faker.number.int({ min: 7, max: 8 }) },
      { weight: 10, value: faker.number.int({ min: 9, max: 10 }) },
    ]);

    for (let s = 0; s < sentenceCount; s++) {
      const sentenceWords: string[] = [];
      const isShort = faker.datatype.boolean({ probability: 0.3 });

      if (isShort) {
        const lengthRange = faker.number.int({ min: 3, max: 6 });
        faker.lorem
          .words(lengthRange)
          .split(/\s+/)
          .forEach((w) => sentenceWords.push(w));
      } else {
        if (faker.datatype.boolean({ probability: 0.5 })) {
          sentenceWords.push(faker.helpers.arrayElement(starters));
        }
        const lengthRange = faker.helpers.weightedArrayElement([
          { weight: 25, value: { min: 5, max: 9 } },
          { weight: 40, value: { min: 10, max: 15 } },
          { weight: 25, value: { min: 16, max: 22 } },
          { weight: 10, value: { min: 23, max: 30 } },
        ]);
        faker.lorem
          .words(faker.number.int(lengthRange))
          .split(/\s+/)
          .forEach((w) => sentenceWords.push(w));

        if (faker.datatype.boolean({ probability: 0.35 })) {
          faker.helpers
            .arrayElement(bridges)
            .split(/\s+/)
            .forEach((w) => sentenceWords.push(w));
          faker.lorem
            .words(faker.number.int({ min: 3, max: 8 }))
            .split(/\s+/)
            .forEach((w) => sentenceWords.push(w));
        }
      }

      for (const raw of sentenceWords) {
        const text = sanitizeWord(raw);
        if (!text) continue;
        turnWords.push({
          text: ` ${text}`,
          duration: durationForWord(text),
          gap: faker.number.int({ min: 40, max: 120 }),
        });
      }

      if (s < sentenceCount - 1 && sentenceCount >= 2) {
        const lastWord = turnWords[turnWords.length - 1];
        if (lastWord) {
          lastWord.gap += faker.number.int({ min: 150, max: 600 });
        }
      }
    }

    const postTurnGap =
      faker.number.int({ min: 400, max: 1200 }) +
      (faker.datatype.boolean({ probability: 0.2 })
        ? faker.number.int({ min: 1000, max: 2500 })
        : 0);

    pool.push({ words: turnWords, postTurnGap });
  }

  return pool;
};

export const buildLongTranscriptsForSessions = (
  sessionIds: string[],
  options: {
    turnCount?: { min: number; max: number };
    days?: number;
  } = {},
): {
  transcripts: Record<string, TranscriptStorage>;
} => {
  const { turnCount: turnCountRange = { min: 1500, max: 2000 }, days = 90 } =
    options;
  const transcripts: Record<string, TranscriptStorage> = {};

  const turnPool = generatePrecomputedTurnPool(200);

  sessionIds.forEach((sessionId) => {
    const transcriptId = id();
    const turnCount = faker.number.int(turnCountRange);
    const createdAt = faker.date.recent({ days });
    const createdAtStr = createdAt.toISOString();
    const startedAt = createdAt.getTime();

    let currentTimeMs = 0;
    let currentChannel = 0;

    const wordsList: WordWithId[] = [];

    for (let turnIndex = 0; turnIndex < turnCount; turnIndex++) {
      const turn = turnPool[turnIndex % turnPool.length];

      for (const wordData of turn.words) {
        wordsList.push({
          id: id(),
          channel: currentChannel,
          text: wordData.text,
          start_ms: currentTimeMs,
          end_ms: currentTimeMs + wordData.duration,
        });
        currentTimeMs += wordData.duration + wordData.gap;
      }

      currentTimeMs += turn.postTurnGap;
      currentChannel = (currentChannel + 1) % 2;
    }

    transcripts[transcriptId] = {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId,
      created_at: createdAtStr,
      started_at: startedAt,
      ended_at: startedAt + currentTimeMs,
      words: JSON.stringify(wordsList),
      speaker_hints: "[]",
      memo_md: "",
    };
  });

  return { transcripts };
};
