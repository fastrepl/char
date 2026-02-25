import { Icon } from "@iconify-icon/react";
import MuxPlayer from "@mux/mux-player-react";

import { cn } from "@hypr/utils";

interface VideoThumbnailProps {
  playbackId: string;
  className?: string;
  onPlay?: () => void;
}

export function VideoThumbnail({
  playbackId,
  className,
  onPlay,
}: VideoThumbnailProps) {
  return (
    <div
      className={cn([
        "relative w-full h-full overflow-hidden group cursor-pointer",
        className,
      ])}
      onClick={onPlay}
    >
      <MuxPlayer
        playbackId={playbackId}
        poster="https://image.mux.com/bpcBHf4Qv5FbhwWD02zyFDb24EBuEuTPHKFUrZEktULQ/thumbnail.png?width=1152&height=648&time=58"
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none aspect-video"
        style={
          {
            "--controls": "none",
          } as React.CSSProperties & { [key: `--${string}`]: string }
        }
      />

      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.();
          }}
          className={cn([
            "size-16 rounded-full bg-white/90 backdrop-blur-xs",
            "flex items-center justify-center",
            "hover:bg-white hover:scale-110 transition-all duration-200",
            "shadow-xl cursor-pointer",
          ])}
          aria-label="Play video"
        >
          <Icon icon="mdi:play" className="text-4xl text-stone-700" />
        </button>
      </div>
    </div>
  );
}
