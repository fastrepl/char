import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { cn } from "@hypr/utils";

export function TrafficLights({ className }: { className?: string }) {
  const withWindow = async (
    cb: (w: {
      close: () => unknown;
      minimize: () => unknown;
      toggleMaximize: () => unknown;
    }) => unknown | Promise<unknown>,
  ) => {
    if (!isTauri()) {
      return;
    }
    await cb(getCurrentWebviewWindow());
  };

  const onClose = () => withWindow((w) => w.close());
  const onMinimize = () => withWindow((w) => w.minimize());
  const onMaximize = () => withWindow((w) => w.toggleMaximize());

  return (
    <div className={cn(["flex gap-2 items-center", className])}>
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={() => {
          void onClose();
        }}
        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10 hover:brightness-90 transition-all"
      />
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={() => {
          void onMinimize();
        }}
        className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-black/10 hover:brightness-90 transition-all"
      />
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={() => {
          void onMaximize();
        }}
        className="h-3 w-3 rounded-full bg-[#28c840] border border-black/10 hover:brightness-90 transition-all"
      />
    </div>
  );
}
