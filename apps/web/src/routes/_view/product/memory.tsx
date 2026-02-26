import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/product/memory")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Memory - Char" },
      {
        name: "description",
        content:
          "Your memory layer that connects all your meetings and conversations. Coming soon.",
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
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700 mb-6 max-w-2xl mx-auto">
              Your memory layer
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              Char connects all your meetings and conversations. The more you
              use it, the more it knows about you, your team, and your work.
            </p>

            <div className="mt-8">
              <button
                disabled
                className={cn([
                  "inline-block px-8 py-3 text-base font-medium cursor-not-allowed",
                  "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs",
                ])}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
