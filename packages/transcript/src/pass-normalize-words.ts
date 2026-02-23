import type { SegmentPass, SegmentWord, WordLike } from "./shared";

export const normalizeWordsPass: SegmentPass = {
  id: "normalize_words",
  run(graph) {
    const normalized = normalizeWords(
      graph.finalWords ?? [],
      graph.partialWords ?? [],
    ).map((word, order) => ({
      ...word,
      order,
    }));

    return { ...graph, words: normalized };
  },
};

function normalizeWords<TFinal extends WordLike, TPartial extends WordLike>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
): SegmentWord[] {
  const normalized = [
    ...finalWords.map((word) => toSegmentWord(word, true)),
    ...partialWords.map((word) => toSegmentWord(word, false)),
  ];

  return normalized.sort((a, b) => a.start_ms - b.start_ms);
}

const toSegmentWord = (word: WordLike, isFinal: boolean): SegmentWord => {
  const normalized: SegmentWord = {
    text: word.text,
    start_ms: word.start_ms,
    end_ms: word.end_ms,
    channel: word.channel,
    isFinal,
    isPending: isFinal && word.state === "pending",
  };

  if ("id" in word && word.id) {
    normalized.id = word.id as string;
  }

  return normalized;
};
