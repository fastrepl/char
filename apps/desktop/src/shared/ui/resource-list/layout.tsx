import type { ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

export function ResourceListLayout({
  listColumn,
  detailsColumn,
}: {
  listColumn: ReactNode;
  detailsColumn: ReactNode;
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={40}>{listColumn}</ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={60}>{detailsColumn}</ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function ResourceDetailEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}
