import { useCallback, useMemo } from "react";

import type { Operations, SegmentWord } from "@hypr/transcript";
import {
  createSearchHighlightSegments,
  WordSpan as SharedWordSpan,
} from "@hypr/transcript/ui";

import { useNativeContextMenu } from "../../../../../../../hooks/useNativeContextMenu";
import { useTranscriptSearch } from "../search-context";

interface WordSpanProps {
  word: SegmentWord;
  audioExists: boolean;
  operations?: Operations;
  onClickWord: (word: SegmentWord) => void;
}

export function WordSpan(props: WordSpanProps) {
  const searchHighlights = useTranscriptSearchHighlights(props.word);

  const contextMenu = useMemo(
    () =>
      props.operations && props.word.id
        ? [
            {
              id: "delete",
              text: "Delete",
              action: () => props.operations!.onDeleteWord?.(props.word.id!),
            },
          ]
        : [],
    [props.operations, props.word.id],
  );

  const showMenu = useNativeContextMenu(contextMenu);

  const handleContextMenu = useCallback(
    (_word: SegmentWord, e: React.MouseEvent) => {
      showMenu(e);
    },
    [showMenu],
  );

  return (
    <SharedWordSpan
      word={props.word}
      audioExists={props.audioExists}
      operations={props.operations}
      searchHighlights={searchHighlights}
      onClickWord={props.onClickWord}
      onContextMenu={
        props.operations && props.word.id ? handleContextMenu : undefined
      }
    />
  );
}

function useTranscriptSearchHighlights(word: SegmentWord) {
  const search = useTranscriptSearch();
  const query = search?.query?.trim() ?? "";
  const isVisible = Boolean(search?.isVisible);
  const activeMatchId = search?.activeMatchId ?? null;

  const segments = useMemo(() => {
    const text = word.text ?? "";

    if (!text) {
      return [{ text: "", isMatch: false }];
    }

    if (!isVisible || !query) {
      return [{ text, isMatch: false }];
    }

    return createSearchHighlightSegments(text, query);
  }, [isVisible, query, word.text]);

  const isActive = word.id === activeMatchId;

  return { segments, isActive };
}
