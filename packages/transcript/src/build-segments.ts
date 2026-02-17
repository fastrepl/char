import { segmentationPass } from "./pass-build-segments";
import { normalizeWordsPass } from "./pass-normalize-words";
import { identityPropagationPass } from "./pass-propagate-identity";
import { resolveIdentitiesPass } from "./pass-resolve-speakers";
import type {
  ChannelProfile,
  ProtoSegment,
  RuntimeSpeakerHint,
  Segment,
  SegmentBuilderOptions,
  SegmentGraph,
  SegmentPass,
  SegmentPassContext,
  SegmentWord,
  SpeakerIdentity,
  SpeakerState,
  StageId,
  WordLike,
} from "./shared";

export function buildSegments<
  TFinal extends WordLike,
  TPartial extends WordLike,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
  speakerHints: readonly RuntimeSpeakerHint[] = [],
  options?: SegmentBuilderOptions,
): Segment[] {
  if (finalWords.length === 0 && partialWords.length === 0) {
    return [];
  }

  const context = createSegmentPassContext(speakerHints, options);
  const initialGraph: SegmentGraph = { finalWords, partialWords };
  const graph = runSegmentPipeline(initialGraph, context);
  const segmentsGraph = ensureGraphKey(
    graph,
    "segments",
    "Segment pipeline must produce segments",
  );
  return finalizeSegments(segmentsGraph.segments);
}

type SegmentPipelineStage<
  TNeeds extends readonly (keyof SegmentGraph)[],
  TEnsures extends keyof SegmentGraph,
> = {
  pass: SegmentPass<TNeeds[number]>;
  needs: TNeeds;
  ensures: TEnsures;
  errorMessage: string;
};

const SEGMENT_PIPELINE = [
  {
    pass: normalizeWordsPass,
    needs: [] as const,
    ensures: "words",
    errorMessage: "normalizeWordsPass must produce words",
  },
  {
    pass: resolveIdentitiesPass,
    needs: ["words"] as const,
    ensures: "frames",
    errorMessage: "resolveIdentitiesPass must produce frames",
  },
  {
    pass: segmentationPass,
    needs: ["frames"] as const,
    ensures: "segments",
    errorMessage: "segmentationPass must produce segments",
  },
  {
    pass: identityPropagationPass,
    needs: ["segments"] as const,
    ensures: "segments",
    errorMessage: "identityPropagationPass must preserve segments",
  },
] as const satisfies readonly SegmentPipelineStage<
  readonly (keyof SegmentGraph)[],
  keyof SegmentGraph
>[];

function runSegmentPipeline(
  initialGraph: SegmentGraph,
  ctx: SegmentPassContext,
): SegmentGraph {
  return SEGMENT_PIPELINE.reduce<SegmentGraph>((graph, stage) => {
    const ensuredGraph = ensureGraphHasKeys(graph, stage.needs, stage.pass.id);
    return runPassAndExpectKey(
      stage.pass,
      ensuredGraph,
      ctx,
      stage.ensures,
      stage.errorMessage,
    );
  }, initialGraph);
}

function createSpeakerState(
  speakerHints: readonly RuntimeSpeakerHint[],
  options?: SegmentBuilderOptions,
): SpeakerState {
  const assignmentByWordIndex = new Map<number, SpeakerIdentity>();
  const humanIdBySpeakerIndex = new Map<number, string>();
  const humanIdByChannel = new Map<ChannelProfile, string>();
  const lastSpeakerByChannel = new Map<ChannelProfile, SpeakerIdentity>();
  const completeChannels = new Set<ChannelProfile>();
  completeChannels.add(0);

  if (options?.numSpeakers === 2) {
    completeChannels.add(1);
  }

  for (const hint of speakerHints) {
    const current = assignmentByWordIndex.get(hint.wordIndex) ?? {};
    if (hint.data.type === "provider_speaker_index") {
      current.speaker_index = hint.data.speaker_index;
    } else {
      current.human_id = hint.data.human_id;
    }
    assignmentByWordIndex.set(hint.wordIndex, { ...current });

    if (current.speaker_index !== undefined && current.human_id !== undefined) {
      humanIdBySpeakerIndex.set(current.speaker_index, current.human_id);
    }
  }

  return {
    assignmentByWordIndex,
    humanIdBySpeakerIndex,
    humanIdByChannel,
    lastSpeakerByChannel,
    completeChannels,
  };
}

function createSegmentPassContext(
  speakerHints: readonly RuntimeSpeakerHint[],
  options?: SegmentBuilderOptions,
): SegmentPassContext {
  const resolvedOptions: SegmentBuilderOptions = options ? { ...options } : {};
  return {
    speakerHints,
    options: resolvedOptions,
    speakerState: createSpeakerState(speakerHints, resolvedOptions),
  };
}

function finalizeSegments(segments: ProtoSegment[]): Segment[] {
  return segments.map((segment) => ({
    key: segment.key,
    words: segment.words.map(({ word }) => {
      const { order: _order, ...rest } = word;
      return rest as SegmentWord;
    }),
  }));
}

type GraphWithKey<TKey extends keyof SegmentGraph> = SegmentGraph & {
  [K in TKey]-?: NonNullable<SegmentGraph[K]>;
};

function ensureGraphHasKeys<TKeys extends readonly (keyof SegmentGraph)[]>(
  graph: SegmentGraph,
  keys: TKeys,
  stageId: StageId,
): GraphWithKey<TKeys[number]> {
  const ensured = keys.reduce<SegmentGraph>((current, key) => {
    return ensureGraphKey(current, key, `${stageId} requires ${String(key)}`);
  }, graph);

  return ensured as GraphWithKey<TKeys[number]>;
}

function ensureGraphKey<TKey extends keyof SegmentGraph>(
  graph: SegmentGraph,
  key: TKey,
  errorMessage: string,
): GraphWithKey<TKey> {
  if (graph[key] == null) {
    throw new Error(errorMessage);
  }
  return graph as GraphWithKey<TKey>;
}

function runPassAndExpectKey<
  TNeeds extends keyof SegmentGraph,
  TEnsures extends keyof SegmentGraph,
>(
  pass: SegmentPass<TNeeds>,
  graph: GraphWithKey<TNeeds>,
  ctx: SegmentPassContext,
  key: TEnsures,
  errorMessage: string,
): GraphWithKey<TEnsures> {
  const next = pass.run(graph, ctx);
  return ensureGraphKey(next, key, errorMessage);
}
