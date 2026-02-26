import type { EditorView } from "~/store/zustand/tabs/schema";

import { FolderChain } from "./folder";
import { ListenButton } from "./listen";
import { MetadataButton } from "./metadata";
import { OverflowButton } from "./overflow";

export function OuterHeader({
  sessionId,
  currentView,
}: {
  sessionId: string;
  currentView: EditorView;
}) {
  return (
    <div className="w-full pt-1">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <FolderChain sessionId={sessionId} />
        </div>

        <div className="flex items-center shrink-0">
          <MetadataButton sessionId={sessionId} />
          <ListenButton sessionId={sessionId} />
          <OverflowButton sessionId={sessionId} currentView={currentView} />
        </div>
      </div>
    </div>
  );
}
