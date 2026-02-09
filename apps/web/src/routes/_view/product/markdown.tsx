import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/markdown")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Markdown Files - Char" },
      {
        name: "description",
        content:
          "No forced cloud. No data held hostage. No bots in your meetings. Plain markdown files on your device that work with any tool.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <FeaturesSection />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center gap-6 py-24 px-4">
        <div className="flex flex-col gap-6 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
            No forced cloud. No data held hostage.
            <br />
            No bots in your meetings.
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Link
            to="/download/"
            className={cn([
              "px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Download for free
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section>
      <div className="grid md:grid-cols-3">
        <div className="p-8 border-r border-neutral-100">
          <h3 className="text-xl font-serif text-stone-600 mb-2">
            Zero lock-in
          </h3>
          <p className="text-neutral-600">
            Choose your preferred STT and LLM provider. Cloud or local.
          </p>
        </div>
        <div className="p-8 border-r border-neutral-100">
          <h3 className="text-xl font-serif text-stone-600 mb-2">
            You own your data
          </h3>
          <p className="text-neutral-600">
            Plain markdown files on your device. Works with any tool.
          </p>
        </div>
        <div className="p-8">
          <h3 className="text-xl font-serif text-stone-600 mb-2">Just works</h3>
          <p className="text-neutral-600">
            A simple, familiar notepad, real-time transcription, and AI
            summaries.
          </p>
        </div>
      </div>
    </section>
  );
}
