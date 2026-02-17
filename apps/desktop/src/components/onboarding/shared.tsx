import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@hypr/utils";

export type SectionStatus = "completed" | "active" | "upcoming";

export function OnboardingSection({
  title,
  description,
  status,
  onBack,
  onNext,
  children,
}: {
  title: string;
  description?: string;
  status: SectionStatus | null;
  onBack?: () => void;
  onNext?: () => void;
  children: ReactNode;
}) {
  if (!status) return null;

  const isActive = status === "active";
  const isCompleted = status === "completed";

  return (
    <section>
      <div
        className={cn([
          "flex items-center gap-2 mb-4 transition-opacity duration-300",
          status === "upcoming" && "opacity-40",
          isCompleted && "opacity-60",
        ])}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900 font-serif">
              {title}
            </h2>
            {isCompleted && (
              <CheckIcon className="size-3.5 text-neutral-400" aria-hidden />
            )}
            {import.meta.env.DEV && isActive && (onBack || onNext) && (
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    onClick={onBack}
                    aria-label="Go to previous section"
                    className="rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-600"
                  >
                    <ChevronLeftIcon className="size-3" />
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    aria-label="Go to next section"
                    className="rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-600"
                  >
                    <ChevronRightIcon className="size-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden px-1 -mx-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function OnboardingButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className="w-full py-3 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
    />
  );
}

export function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-sm text-neutral-500">{text}</span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
