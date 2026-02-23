import type {
  ChannelProfile,
  ProtoSegment,
  ResolvedWordFrame,
  SegmentBuilderOptions,
  SegmentKey,
  SpeakerIdentity,
} from "./shared";
import { SegmentKey as SegmentKeyUtils } from "./shared";

function createSegmentKeyFromIdentity(
  channel: ChannelProfile,
  identity?: SpeakerIdentity,
): SegmentKey {
  const params: {
    channel: ChannelProfile;
    speaker_index?: number;
    speaker_human_id?: string;
  } = { channel };

  if (identity?.speaker_index !== undefined) {
    params.speaker_index = identity.speaker_index;
  }

  if (identity?.human_id !== undefined) {
    params.speaker_human_id = identity.human_id;
  }

  return SegmentKeyUtils.make(params);
}

type ChannelSegmentsState = {
  activeByKey: Map<string, ProtoSegment>;
  lastAnonymous?: ProtoSegment;
};

type SegmentationReducerState = {
  segments: ProtoSegment[];
  channelState: Map<ChannelProfile, ChannelSegmentsState>;
};

export function collectSegments(
  frames: ResolvedWordFrame[],
  options?: SegmentBuilderOptions,
): ProtoSegment[] {
  const initial: SegmentationReducerState = {
    segments: [],
    channelState: new Map(),
  };

  const finalState = frames.reduce<SegmentationReducerState>(
    (state, frame) => reduceFrame(state, frame, options),
    initial,
  );

  return finalState.segments;
}

function reduceFrame(
  state: SegmentationReducerState,
  frame: ResolvedWordFrame,
  options?: SegmentBuilderOptions,
): SegmentationReducerState {
  const key = createSegmentKeyFromIdentity(frame.word.channel, frame.identity);
  const channelState = channelStateFor(state.channelState, key.channel);
  const extension = selectSegmentExtension(
    state,
    channelState,
    key,
    frame,
    options,
  );

  if (extension) {
    extension.segment.words.push(frame);
    channelState.activeByKey.set(
      SegmentKeyUtils.serialize(extension.segment.key),
      extension.segment,
    );
    trackAnonymousSegment(channelState, extension.segment);
    return state;
  }

  const segment = startSegment(state.segments, key, frame);
  channelState.activeByKey.set(SegmentKeyUtils.serialize(key), segment);
  trackAnonymousSegment(channelState, segment);
  return state;
}

function selectSegmentExtension(
  state: SegmentationReducerState,
  channelState: ChannelSegmentsState,
  key: SegmentKey,
  frame: ResolvedWordFrame,
  options?: SegmentBuilderOptions,
): { segment: ProtoSegment } | undefined {
  const segmentId = SegmentKeyUtils.serialize(key);
  const activeSegment = channelState.activeByKey.get(segmentId);

  if (activeSegment && canExtend(state, activeSegment, key, frame, options)) {
    return { segment: activeSegment };
  }

  const anonymousSegment = channelState.lastAnonymous;
  if (
    !SegmentKeyUtils.hasSpeakerIdentity(key) &&
    frame.word.isFinal &&
    anonymousSegment &&
    canExtend(state, anonymousSegment, anonymousSegment.key, frame, options)
  ) {
    return { segment: anonymousSegment };
  }

  return undefined;
}

function startSegment(
  segments: ProtoSegment[],
  key: SegmentKey,
  frame: ResolvedWordFrame,
): ProtoSegment {
  const segment: ProtoSegment = { key, words: [frame] };
  segments.push(segment);
  return segment;
}

function canExtendWithSpeakerIdentity(
  existingSegment: ProtoSegment,
  candidateKey: SegmentKey,
  frame: ResolvedWordFrame,
  lastSegmentInState: ProtoSegment | undefined,
): boolean {
  if (!SegmentKeyUtils.hasSpeakerIdentity(candidateKey)) {
    return true;
  }

  if (!frame.word.isFinal) {
    return SegmentKeyUtils.equals(existingSegment.key, candidateKey);
  }

  return (
    lastSegmentInState !== undefined &&
    SegmentKeyUtils.equals(lastSegmentInState.key, candidateKey)
  );
}

function canExtendNonLastSegment(
  existingSegment: ProtoSegment,
  candidateKey: SegmentKey,
  frame: ResolvedWordFrame,
  isLastSegment: boolean,
): boolean {
  if (isLastSegment) {
    return true;
  }

  if (!frame.word.isFinal) {
    const allWordsArePartial = existingSegment.words.every(
      (w) => !w.word.isFinal,
    );

    const hasInheritedIdentity =
      SegmentKeyUtils.hasSpeakerIdentity(candidateKey);
    return allWordsArePartial || hasInheritedIdentity;
  }

  return true;
}

function canExtend(
  state: SegmentationReducerState,
  existingSegment: ProtoSegment,
  candidateKey: SegmentKey,
  frame: ResolvedWordFrame,
  options?: SegmentBuilderOptions,
): boolean {
  const lastSegment = state.segments[state.segments.length - 1];
  const isLastSegment = existingSegment === lastSegment;

  if (
    !canExtendWithSpeakerIdentity(
      existingSegment,
      candidateKey,
      frame,
      lastSegment,
    )
  ) {
    return false;
  }

  if (
    !canExtendNonLastSegment(
      existingSegment,
      candidateKey,
      frame,
      isLastSegment,
    )
  ) {
    return false;
  }

  const maxGapMs = options?.maxGapMs ?? 2000;
  const lastWord = existingSegment.words[existingSegment.words.length - 1].word;
  return frame.word.start_ms - lastWord.end_ms <= maxGapMs;
}

function channelStateFor(
  channelState: Map<ChannelProfile, ChannelSegmentsState>,
  channel: ChannelProfile,
): ChannelSegmentsState {
  const existing = channelState.get(channel);
  if (existing) {
    return existing;
  }

  const state: ChannelSegmentsState = {
    activeByKey: new Map(),
  };
  channelState.set(channel, state);
  return state;
}

function trackAnonymousSegment(
  state: ChannelSegmentsState,
  segment: ProtoSegment,
): void {
  if (!SegmentKeyUtils.hasSpeakerIdentity(segment.key)) {
    state.lastAnonymous = segment;
  }
}
