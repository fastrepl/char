import { Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export function SidebarDownloadCard() {
  return (
    <div className="border border-neutral-200 rounded-xs overflow-hidden bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px] p-4">
      <h3 className="font-serif text-sm text-stone-700 mb-3 text-center">
        Try Char for yourself
      </h3>
      <Link
        to="/download/"
        className={cn([
          "group px-4 h-9 flex items-center justify-center text-sm w-full",
          "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
          "hover:scale-[102%] active:scale-[98%]",
          "transition-all",
        ])}
      >
        Download for free
      </Link>
    </div>
  );
}

interface CtaCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  source?: string;
}

export function CtaCard({
  title = "Talk to the founders",
  description = "Drowning in back-to-back meetings? In 20 minutes, we'll show you how to take control of your notes and reclaim hours each week.",
  buttonText = "Book a call",
  buttonUrl = "/founders",
  source = "blog",
}: CtaCardProps) {
  const finalUrl =
    buttonUrl === "/founders" && source
      ? `${buttonUrl}?source=${source}`
      : buttonUrl;
  return (
    <div className="my-12 border border-neutral-200 rounded-xs overflow-hidden bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <div className="p-8 text-center">
        <h3 className="font-serif text-2xl text-stone-700 mb-3">{title}</h3>
        {description && (
          <p className="text-base text-neutral-600 mb-6 max-w-2xl mx-auto">
            {description}
          </p>
        )}
        <a
          href={finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn([
            "group px-6 h-12 min-w-52 inline-flex items-center justify-center text-base sm:text-lg",
            "bg-linear-to-t from-stone-600 to-stone-500 rounded-full ",
            "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            "transition-all",
            "text-white! no-underline!",
          ])}
        >
          {buttonText}
        </a>
      </div>
    </div>
  );
}
