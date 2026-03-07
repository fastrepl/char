import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/sales")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Sales Teams - Char" },
      {
        name: "description",
        content:
          "Stop scribbling during sales calls. Char records, transcribes, and summarizes so you can focus on the conversation.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Sales Teams - Char",
      },
      {
        property: "og:description",
        content:
          "Stop scribbling during sales calls. Char records, transcribes, and summarizes so you can focus on the conversation.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/solution/sales",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:microphone",
    title: "Nothing gets missed",
    description:
      "Hit record and forget about it. Pricing discussions, objections, buying signals, it's all in the transcript.",
  },
  {
    icon: "mdi:text-box-check",
    title: "Deal context at a glance",
    description:
      "Summaries pull out competitor mentions, budget info, and who the decision-makers are.",
  },
  {
    icon: "mdi:clipboard-list",
    title: "Next steps, automatically",
    description:
      "Action items and follow-ups get extracted from the conversation. No more digging through notes.",
  },
  {
    icon: "mdi:chart-timeline-variant",
    title: "Review your calls",
    description:
      "Go back and listen to how a call went. Useful for coaching or figuring out where a deal stalled.",
  },
  {
    icon: "mdi:share-variant",
    title: "Share with your team",
    description:
      "Send call summaries to teammates so everyone knows where a deal stands.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Stays on your device",
    description:
      "Sensitive deal data doesn't leave your machine. AI runs locally.",
  },
];

const useCases = [
  {
    title: "Discovery Calls",
    description:
      "Pain points, requirements, buying criteria. It's all in the transcript so you can focus on asking good questions.",
  },
  {
    title: "Product Demos",
    description:
      "Run the demo. Char catches the questions, feature requests, and what they seemed most interested in.",
  },
  {
    title: "Negotiation Calls",
    description:
      "Pricing discussions and contract terms on the record. Useful when someone remembers the conversation differently.",
  },
  {
    title: "QBRs & Account Reviews",
    description:
      "Customer feedback and renewal conversations documented. Good for tracking sentiment over time.",
  },
];

function Component() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="mx-auto max-w-6xl border-x border-neutral-100 bg-white">
        <HeroSection />
        <FeaturesSection />
        <UseCasesSection />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-700">
            <Icon icon="mdi:briefcase" className="text-lg" />
            <span>For Sales Teams</span>
          </div>
          <h1 className="mb-6 font-serif text-4xl tracking-tight text-stone-700 sm:text-5xl">
            Stop scribbling
            <br />
            during sales calls
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600 sm:text-xl">
            Focus on the conversation. Char records everything, pulls out action
            items, and writes up the summary so you don't have to.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/download/"
              className={cn([
                "inline-block rounded-full px-8 py-3 text-base font-medium",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "transition-transform hover:scale-105 active:scale-95",
              ])}
            >
              Download for free
            </Link>
            <Link
              to="/product/ai-notetaking/"
              className={cn([
                "inline-block rounded-full px-8 py-3 text-base font-medium",
                "border border-stone-300 text-stone-700",
                "transition-colors hover:bg-stone-50",
              ])}
            >
              See how it works
            </Link>
          </div>
        </header>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="border-t border-neutral-100 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center font-serif text-3xl text-stone-700">
          What you get
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-neutral-600">
          The stuff that actually matters when you're running 5 calls a day.
        </p>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
                <Icon icon={feature.icon} className="text-2xl text-stone-700" />
              </div>
              <h3 className="text-lg font-medium text-stone-700">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section className="border-t border-neutral-100 bg-stone-50/50 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center font-serif text-3xl text-stone-700">
          Works across the sales cycle
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-neutral-600">
          Discovery to QBR, same tool.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-xl border border-neutral-100 bg-white p-6"
            >
              <h3 className="mb-2 text-lg font-medium text-stone-700">
                {useCase.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-t border-neutral-100 px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 font-serif text-3xl text-stone-700">
          Try it on your next call
        </h2>
        <p className="mb-8 text-neutral-600">
          Free to download. Takes about two minutes to set up.
        </p>
        <Link
          to="/download/"
          className={cn([
            "inline-block rounded-full px-8 py-3 text-base font-medium",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "transition-transform hover:scale-105 active:scale-95",
          ])}
        >
          Get started for free
        </Link>
      </div>
    </section>
  );
}
