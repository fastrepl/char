import { AlertCircleIcon, CheckIcon } from "lucide-react";
import { usePermission } from "~/shared/hooks/usePermissions";

import { cn } from "@hypr/utils";

function PermissionBlock({
  name,
  status,
  description,
  isPending,
  onAction,
}: {
  name: string;
  status: string | undefined;
  description: { authorized: string; unauthorized: string };
  isPending: boolean;
  onAction: () => void;
}) {
  const isAuthorized = status === "authorized";

  return (
    <button
      onClick={onAction}
      disabled={isPending || isAuthorized}
      className={cn([
        "flex flex-1 basis-0 min-w-0 items-center gap-2.5 rounded-xl py-2 px-3 text-left transition-all",
        isAuthorized
          ? "border border-neutral-200"
          : "border border-red-200 bg-red-50 hover:bg-red-100/60 active:scale-[0.98]",
        isPending && "opacity-50 cursor-not-allowed",
      ])}
      aria-label={
        isAuthorized
          ? `${name} permission granted`
          : `Request ${name.toLowerCase()} permission`
      }
    >
      <div
        className={cn([
          "size-6 shrink-0 flex items-center justify-center rounded-md",
          isAuthorized
            ? "bg-stone-100 text-stone-600"
            : "bg-linear-to-t from-red-600 to-red-500 text-white",
        ])}
      >
        {isAuthorized ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <AlertCircleIcon className="size-3.5" />
        )}
      </div>
      <div className="min-w-0">
        <span
          className={cn([
            "text-sm font-medium",
            isAuthorized ? "text-neutral-900" : "text-red-600",
          ])}
        >
          {name}
        </span>
        <p className="text-xs text-neutral-500 truncate hidden @[480px]:block">
          {isAuthorized ? description.authorized : description.unauthorized}
        </p>
      </div>
    </button>
  );
}

export function PermissionsSection() {
  const mic = usePermission("microphone");
  const systemAudio = usePermission("systemAudio");

  const handleAction = (perm: ReturnType<typeof usePermission>) => {
    if (perm.status === "denied") {
      perm.open();
    } else {
      perm.request();
    }
  };

  return (
    <div className="@container flex items-stretch gap-3">
      <PermissionBlock
        name="Microphone"
        status={mic.status}
        description={{
          authorized: "Good to go :)",
          unauthorized: "To capture your voice",
        }}
        isPending={mic.isPending}
        onAction={() => handleAction(mic)}
      />

      <PermissionBlock
        name="System audio"
        status={systemAudio.status}
        description={{
          authorized: "Good to go :)",
          unauthorized: "To capture what other people are saying",
        }}
        isPending={systemAudio.isPending}
        onAction={() => handleAction(systemAudio)}
      />
    </div>
  );
}
