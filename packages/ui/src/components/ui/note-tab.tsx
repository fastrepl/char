import { cn } from "@hypr/utils";

export function NoteTab({
  isActive,
  onClick,
  className,
  children,
}: {
  isActive: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "relative my-2 border-b-2 px-1 py-0.5 text-xs font-medium transition-all duration-200 shrink-0",
        isActive
          ? ["border-neutral-900", "text-neutral-900"]
          : [
              "border-transparent",
              "text-neutral-600",
              "hover:text-neutral-800",
            ],
        className,
      ])}
    >
      <span className="flex items-center gap-1 h-5">{children}</span>
    </button>
  );
}
