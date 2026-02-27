import { cn } from "@hypr/utils";

export function HyprProviderRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn([
        "flex flex-col gap-3",
        "py-2 px-3 rounded-md border bg-white",
      ])}
    >
      {children}
    </div>
  );
}

export function HyprCloudCTAButton({
  isPro,
  canStartTrial,
  highlight,
  onClick,
}: {
  isPro: boolean;
  canStartTrial: boolean | undefined;
  highlight?: boolean;
  onClick: () => void;
}) {
  const buttonLabel = isPro
    ? "Ready to use"
    : canStartTrial
      ? "Start Free Trial"
      : "Upgrade to Pro";

  const showShimmer = highlight && !isPro;

  return (
    <button
      onClick={onClick}
      className={cn([
        "relative overflow-hidden w-fit h-8.5",
        "px-4 rounded-full text-xs font-mono text-center",
        "transition-all duration-150",
        isPro
          ? "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 shadow-xs hover:shadow-md"
          : "bg-linear-to-t from-stone-600 to-stone-500 text-white shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
      ])}
    >
      {showShimmer && (
        <div
          className={cn([
            "absolute inset-0 -translate-x-full",
            "bg-linear-to-r from-transparent via-white/20 to-transparent",
            "animate-shimmer",
          ])}
        />
      )}
      <span className="relative z-10">{buttonLabel}</span>
    </button>
  );
}
