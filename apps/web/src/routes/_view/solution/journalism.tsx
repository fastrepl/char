import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/journalism")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Journalists - Char" },
      {
        name: "description",
        content:
          "Capture interviews, press briefings, and source conversations with AI-powered meeting notes. Report with confidence using Char.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Journalists - Char",
      },
      {
        property: "og:description",
        content:
          "Focus on the story while AI captures every quote. Get accurate transcriptions and never miss a detail.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/journalism",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:microphone",
    title: "Interview Recording",
    description:
      "Record interviews, press conferences, and source conversations. Get accurate transcriptions with timestamps.",
  },
  {
    icon: "mdi:format-quote-open",
    title: "Precise Quotes",
    description:
      "Extract exact quotes with context. Ensure accuracy and attribution in your reporting.",
  },
  {
    icon: "mdi:magnify",
    title: "Fact Verification",
    description:
      "Search through interview transcripts to verify details, dates, and claims from your sources.",
  },
  {
    icon: "mdi:clock-fast",
    title: "Fast Turnaround",
    description:
      "Get instant transcriptions. Spend less time on notes and more time writing your story.",
  },
  {
    icon: "mdi:archive",
    title: "Source Documentation",
    description:
      "Maintain detailed records of all interviews and conversations. Protect your reporting with documentation.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Source Protection",
    description:
      "Local AI processing ensures sensitive source information stays private and secure on your device.",
  },
];

const useCases = [
  {
    title: "Investigative Reporting",
    description:
      "Document complex interviews and source conversations. Build comprehensive records for long-form investigations.",
  },
  {
    title: "Breaking News",
    description:
      "Capture press briefings and rapid interviews. Get quotes fast for deadline reporting.",
  },
  {
    title: "Feature Stories",
    description:
      "Record in-depth interviews and personal narratives. Find the perfect quotes to bring your stories to life.",
  },
  {
    title: "Press Events",
    description:
      "Capture statements from press conferences, panel discussions, and media events with accurate attribution.",
  },
];

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen overflow-x-hidden"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
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
        <header className="mb-8 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-600 text-sm mb-6">
            <Icon icon="mdi:newspaper" className="text-lg" />
            <span>For Journalists</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Report with confidence using
            <br />
            AI-powered meeting notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Focus on asking the right questions while Char captures every quote,
            verifies accuracy, and helps you tell compelling stories.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
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
            <Link
              to="/product/ai-notetaking/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "border border-stone-300 text-stone-600",
                "hover:bg-stone-50 transition-colors",
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
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 text-center mb-4">
          Built for journalism excellence
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you report with accuracy and
          confidence.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                <Icon icon={feature.icon} className="text-2xl text-stone-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-700">
                {feature.title}
              </h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
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
    <section className="px-6 py-16 bg-stone-50/50 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 text-center mb-4">
          For every beat and story
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Whatever you cover, Char helps you capture and verify every
          conversation.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="bg-white p-6 rounded-xl border border-neutral-100"
            >
              <h3 className="text-lg font-medium text-stone-700 mb-2">
                {useCase.title}
              </h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
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
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Ready to report with confidence?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join journalists who are telling better stories with AI-powered
          meeting notes.
        </p>
        <Link
          to="/download/"
          className={cn([
            "inline-block px-8 py-3 text-base font-medium rounded-full",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          Get started for free
        </Link>
      </div>
    </section>
  );
}
