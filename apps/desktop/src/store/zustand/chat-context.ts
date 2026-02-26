import { create } from "zustand";
import type { ContextEntity } from "~/chat/context-item";

type PerGroupContext = {
  contextEntities: ContextEntity[];
};

interface ChatContextState {
  groupId: string | undefined;
  contexts: Record<string, PerGroupContext>;
}

interface ChatContextActions {
  setGroupId: (groupId: string | undefined) => void;
  persistContext: (groupId: string, entities: ContextEntity[]) => void;
}

export const useChatContext = create<ChatContextState & ChatContextActions>(
  (set, get) => ({
    groupId: undefined,
    contexts: {},
    setGroupId: (groupId) => set({ groupId }),
    persistContext: (groupId, entities) => {
      set({
        contexts: {
          ...get().contexts,
          [groupId]: { contextEntities: entities },
        },
      });
    },
  }),
);
