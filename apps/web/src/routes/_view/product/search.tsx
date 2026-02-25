import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";
import { CTASection } from "@/routes/_view/index";

export const Route = createFileRoute("/_view/product/search")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Search - Char" },
      {
        name: "description",
        content:
          "Search your entire meeting history in seconds. Find exactly what was said, when it was said, and who said it.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  const heroInputRef = useRef<HTMLInputElement>(null);

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <HowItWorksSection />
        <SlashSeparator />
        <UseCasesSection />
        <SlashSeparator />
        <FlexibilitySection />
        <SlashSeparator />
        <CTASection heroInputRef={heroInputRef} />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center gap-6 py-24 px-4">
        <div className="flex flex-col gap-6 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700">
            Search your entire meeting history in seconds
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-3xl mx-auto">
            Find exactly what was said, when it was said, and who said it.
          </p>
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

function HowItWorksSection() {
  return (
    <section className="bg-stone-50/30">
      <div className="p-8">
        <h2 className="text-3xl font-serif text-stone-700 mb-8 text-center">
          How it works
        </h2>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="p-8 border-r border-neutral-100">
          <Icon icon="mdi:magnify" className="text-3xl text-stone-700 mb-4" />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            Quick search
          </h3>
          <p className="text-neutral-600">
            Type in the search bar, get instant semantic results, navigate with
            arrow keys.
          </p>
        </div>
        <div className="p-8">
          <Icon
            icon="mdi:filter-variant"
            className="text-3xl text-stone-700 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            Advanced search
          </h3>
          <p className="text-neutral-600">
            Filter by date, person, or organization. Use quotes for exact phrase
            matching.
          </p>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section>
      <div className="p-8">
        <h2 className="text-3xl font-serif text-stone-700 mb-4 text-center">
          Your meeting history becomes useful
        </h2>
        <p className="text-lg text-neutral-600 text-center max-w-2xl mx-auto">
          With search, your meeting history becomes a knowledge base you
          actually use
        </p>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="p-8 border-r border-b border-neutral-100">
          <Icon icon="mdi:phone" className="text-3xl text-stone-700 mb-4" />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            Before a client call
          </h3>
          <p className="text-neutral-600">
            Pull up everything discussed in previous meetings—pricing,
            commitments, concerns.
          </p>
        </div>
        <div className="p-8 border-b border-neutral-100">
          <Icon
            icon="mdi:chart-timeline-variant"
            className="text-3xl text-stone-700 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            During quarterly reviews
          </h3>
          <p className="text-neutral-600">
            Search all team syncs to see what blockers came up repeatedly.
          </p>
        </div>
        <div className="p-8 border-r border-neutral-100">
          <Icon
            icon="mdi:account-plus"
            className="text-3xl text-stone-700 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            When onboarding someone
          </h3>
          <p className="text-neutral-600">
            Find every decision and context discussion without creating a
            separate doc.
          </p>
        </div>
        <div className="p-8">
          <Icon
            icon="mdi:comment-question"
            className="text-3xl text-stone-700 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            Settling disagreements
          </h3>
          <p className="text-neutral-600">
            "I'm pretty sure we decided on version A" — Find the exact
            conversation.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlexibilitySection() {
  return (
    <section className="bg-stone-50/30">
      <div className="p-8">
        <h2 className="text-3xl font-serif text-stone-700 mb-4 text-center">
          You're not restricted to Char's built-in search
        </h2>
        <p className="text-lg text-neutral-600 text-center max-w-3xl mx-auto">
          Since every note is a .md file on your device, search them however you
          want. Use Spotlight. Or{" "}
          <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-sm font-mono">
            grep
          </code>{" "}
          from terminal. Or your IDE's search. Or Obsidian's graph view. Your
          choice.
        </p>
      </div>
    </section>
  );
}
