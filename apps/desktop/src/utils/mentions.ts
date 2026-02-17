import type { MentionSourceType, MentionTargetType } from "@hypr/store";
import type { JSONContent } from "@hypr/tiptap/editor";

export interface ExtractedMention {
  target_id: string;
  target_type: MentionTargetType;
}

export function extractMentionsFromTiptap(
  content: JSONContent,
): ExtractedMention[] {
  const mentions: ExtractedMention[] = [];
  const seen = new Set<string>();

  const traverse = (node: JSONContent) => {
    if (node.type === "mention-@" && node.attrs) {
      const key = `${node.attrs.type}:${node.attrs.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({
          target_id: node.attrs.id as string,
          target_type: node.attrs.type as MentionTargetType,
        });
      }
    }

    if (node.content) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  };

  traverse(content);
  return mentions;
}

export function syncMentions(
  store: {
    getSliceRowIds: (indexId: string, sliceId: string) => string[];
    delRow: (tableId: string, rowId: string) => void;
    setRow: (
      tableId: string,
      rowId: string,
      row: Record<string, unknown>,
    ) => void;
  },
  userId: string,
  sourceId: string,
  sourceType: MentionSourceType,
  mentions: ExtractedMention[],
  indexId: string,
) {
  const existingRowIds = store.getSliceRowIds(indexId, sourceId);

  for (const rowId of existingRowIds) {
    store.delRow("mapping_mention", rowId);
  }

  for (const mention of mentions) {
    const rowId = `${sourceId}:${mention.target_type}:${mention.target_id}`;
    store.setRow("mapping_mention", rowId, {
      user_id: userId,
      source_id: sourceId,
      source_type: sourceType,
      target_id: mention.target_id,
      target_type: mention.target_type,
    });
  }
}
