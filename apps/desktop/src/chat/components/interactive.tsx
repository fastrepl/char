import { Resizable } from "re-resizable";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@hypr/utils";

export function InteractiveContainer({
  children,
  width,
  height,
}: {
  children: ReactNode;
  width: number;
  height: number;
}) {
  const [isResizing, setIsResizing] = useState(false);

  return createPortal(
    <div className="fixed z-100" style={{ right: 16, bottom: 16 }}>
      <Resizable
        defaultSize={{ width, height }}
        minWidth={400}
        minHeight={400}
        bounds="window"
        enable={{
          top: true,
          right: false,
          bottom: false,
          left: true,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: true,
        }}
        className={cn([
          "bg-white rounded-b-2xl rounded-t-xl shadow-2xl",
          "border border-neutral-200",
          "flex flex-col",
          !isResizing && "transition-all duration-200",
        ])}
        handleStyles={{
          top: { height: "4px", top: 0 },
          left: { width: "4px", left: 0 },
          topLeft: { width: "12px", height: "12px", top: 0, left: 0 },
        }}
        onResizeStart={() => setIsResizing(true)}
        onResizeStop={() => setIsResizing(false)}
      >
        {children}
      </Resizable>
    </div>,
    document.body,
  );
}
