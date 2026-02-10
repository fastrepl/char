import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/product/markdown")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Markdown Files - Char" },
      {
        name: "description",
        content:
          "Your notes are stored as plain markdown files. Own your data, export anytime, and use with any markdown-compatible tool.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white sm:h-[calc(100vh-65px)] overflow-hidden"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white h-full relative flex flex-col">
        <div className="flex-1 bg-[linear-gradient(to_bottom,rgba(245,245,244,0.2),white_50%,rgba(245,245,244,0.3))] px-6 py-12 flex items-center justify-center relative z-10">
          <div className="text-center max-w-4xl mx-auto pointer-events-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6 max-w-2xl mx-auto">
              Markdown Files
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              Your notes are stored as plain markdown files. Own your data,
              export anytime, and use with any markdown-compatible tool.
            </p>

            <div className="mt-8">
              <Link
                to="/download/"
                className={cn([
                  "inline-block px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Download for free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
