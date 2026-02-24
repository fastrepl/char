import { Upload } from "lucide-react";
import { useState } from "react";

import { cn } from "@hypr/utils";

export function UploadArea({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      onFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn([
        "border-2 border-dashed rounded-xs p-12 text-center transition-all",
        isDragging && "border-stone-500 bg-stone-50",
        !isDragging && "border-neutral-200",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:border-stone-400",
      ])}
    >
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={cn([
          "flex flex-col items-center gap-4",
          !disabled && "cursor-pointer",
        ])}
      >
        <Upload className="text-neutral-400" size={48} />
        <div>
          <p className="text-lg font-medium text-neutral-700">
            Drop audio file or{" "}
            <span className="text-stone-600 underline underline-offset-2 hover:text-stone-800">
              click to upload
            </span>
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            Supports MP3, WAV, M4A, and other audio formats
          </p>
        </div>
      </label>
    </div>
  );
}
