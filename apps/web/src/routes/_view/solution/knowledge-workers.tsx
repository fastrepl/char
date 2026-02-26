import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/knowledge-workers")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Knowledge Workers - Char" },
      {
        name: "description",
        content:
          "Capture every meeting detail with AI-powered notes. Get automatic transcriptions, summaries, and action items. Focus on the conversation, not on taking notes.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Knowledge Workers - Char",
      },
      {
        property: "og:description",
        content:
          "Never miss important details. AI-powered meeting notes capture everything, extract action items, and help you stay organized.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/solution/knowledge-workers",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:microphone",
    title: "Capture Every Detail",
    description:
      "Record meetings automatically. Never miss important discussions, decisions, or action items.",
  },
  {
    icon: "mdi:text-box-check",
    title: "Smart Summaries",
    description:
      "AI extracts key points, decisions, and action items from every meeting automatically.",
  },
  {
    icon: "mdi:clipboard-list",
    title: "Action Items & Follow-ups",
    description:
      "Automatically identify next steps, commitments, and follow-up tasks from every conversation.",
  },
  {
    icon: "mdi:magnify",
    title: "Searchable Archive",
    description:
      "Find any meeting, note, or conversation instantly with powerful full-text search.",
  },
  {
    icon: "mdi:share-variant",
    title: "Easy Sharing",
    description:
      "Share meeting summaries with your team. Keep everyone aligned and informed.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Privacy-First",
    description:
      "Your meetings stay private. Local AI processing means sensitive data never leaves your device.",
  },
];

const useCases = [
  {
    title: "Team Meetings",
    description:
      "Capture discussions, decisions, and action items. Keep your team aligned with shared meeting notes.",
  },
  {
    title: "Client Calls",
    description:
      "Focus on the conversation while AI captures requirements, feedback, and next steps.",
  },
  {
    title: "Brainstorming Sessions",
    description:
      "Record creative sessions and never lose a great idea. Review and organize thoughts later.",
  },
  {
    title: "One-on-Ones",
    description:
      "Document feedback, goals, and commitments. Build a searchable history of your conversations.",
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
            <Icon icon="mdi:account-group" className="text-lg" />
            <span>For Knowledge Workers</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Focus on the conversation,
            <br />
            not on taking notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Stop scrambling to capture everything. Char records your meetings,
            transcribes conversations, and creates smart summaries so you can
            stay present.
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
          Built for how you work
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you capture, organize, and act on your
          meetings.
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
          For every conversation
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From team syncs to client calls, Char helps you capture and act on
          every interaction.
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
          Ready to transform your meetings?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join knowledge workers who are getting more done with AI-powered
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
