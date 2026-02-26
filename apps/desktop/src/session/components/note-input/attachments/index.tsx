import { ImageIcon, LinkIcon, X } from "lucide-react";

import { formatDistanceToNow } from "@hypr/utils";

export type ImageAttachment = {
  attachmentId: string;
  type: "image";
  url: string;
  path: string;
  title: string;
  thumbnailUrl?: string;
  addedAt: string;
  isPersisted?: boolean;
};

export type LinkAttachment = {
  attachmentId: string;
  type: "link";
  url: string;
  title: string;
  addedAt: string;
  isPersisted?: boolean;
};

export type Attachment = ImageAttachment | LinkAttachment;

function AttachmentCard({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove?: (attachmentId: string) => void;
}) {
  const addedLabel = formatAttachmentTimestamp(attachment.addedAt);

  if (attachment.type === "link") {
    return (
      <div className="flex flex-col gap-3 p-4 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition-colors relative">
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(attachment.attachmentId)}
            className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white border border-neutral-200 transition-colors"
            aria-label="Remove attachment"
          >
            <X className="w-3 h-3 text-neutral-600" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-neutral-100 rounded">
            <LinkIcon className="w-6 h-6 text-neutral-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neutral-900 truncate">
              {attachment.title}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">{addedLabel}</div>
          </div>
        </div>
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 underline truncate"
        >
          {attachment.url}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition-colors relative">
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.attachmentId)}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white border border-neutral-200 transition-colors z-10"
          aria-label="Remove attachment"
        >
          <X className="w-3 h-3 text-neutral-600" />
        </button>
      )}
      <div className="relative w-full aspect-video bg-neutral-100 rounded overflow-hidden">
        {attachment.thumbnailUrl ? (
          <img
            src={attachment.thumbnailUrl}
            alt={attachment.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <ImageIcon className="w-8 h-8 text-neutral-400" />
          </div>
        )}
        {!attachment.isPersisted && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-medium text-neutral-600">
              Saving...
            </span>
          </div>
        )}
      </div>
      <div>
        <div className="text-sm font-medium text-neutral-900">
          {attachment.title}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">{addedLabel}</div>
      </div>
    </div>
  );
}

export function Attachments({
  attachments,
  onRemoveAttachment,
  isLoading = false,
}: {
  attachments: Attachment[];
  onRemoveAttachment?: (attachmentId: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-500">
            Loading attachments...
          </div>
        ) : attachments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-xs text-neutral-500">
            <ImageIcon className="w-5 h-5 text-neutral-400" />
            <p>No attachments yet. Use the + icon above to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.attachmentId}
                attachment={attachment}
                onRemove={onRemoveAttachment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAttachmentTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatDistanceToNow(date, { addSuffix: true });
}
