import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/project-management")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Project Management - Hyprnote" },
      {
        name: "description",
        content:
          "Capture every project meeting with AI-powered notes. Track decisions, action items, and stakeholder discussions. Keep projects on track with Hyprnote.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Project Management - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Never miss project decisions. AI-powered meeting notes capture action items, stakeholder feedback, and keep your projects on track.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/project-management",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:clipboard-check",
    title: "Action Item Tracking",
    description:
      "AI automatically extracts action items, owners, and deadlines from every project meeting.",
  },
  {
    icon: "mdi:account-group",
    title: "Stakeholder Management",
    description:
      "Document stakeholder meetings, capture feedback, and track decisions across all project phases.",
  },
  {
    icon: "mdi:chart-gantt",
    title: "Status Updates",
    description:
      "Generate meeting summaries for status reports. Keep stakeholders informed with accurate documentation.",
  },
  {
    icon: "mdi:alert-circle",
    title: "Risk Documentation",
    description:
      "Capture risk discussions, mitigation plans, and issue resolutions from project meetings.",
  },
  {
    icon: "mdi:share-variant",
    title: "Team Alignment",
    description:
      "Share meeting notes with project teams. Keep everyone aligned on decisions and next steps.",
  },
  {
    icon: "mdi:magnify",
    title: "Searchable History",
    description:
      "Find past decisions, commitments, and discussions across all your project meetings instantly.",
  },
];

const useCases = [
  {
    title: "Sprint Planning",
    description:
      "Capture sprint planning discussions, story refinements, and team commitments for agile projects.",
  },
  {
    title: "Stakeholder Reviews",
    description:
      "Document stakeholder feedback, approval decisions, and change requests from review meetings.",
  },
  {
    title: "Stand-ups & Check-ins",
    description:
      "Record daily stand-ups and team check-ins. Track blockers and progress across the project.",
  },
  {
    title: "Retrospectives",
    description:
      "Capture retrospective discussions, improvement ideas, and action items for continuous improvement.",
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
            <Icon icon="mdi:clipboard-text" className="text-lg" />
            <span>For Project Management</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Keep projects on track
            <br />
            with AI-powered notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Focus on leading your projects, not taking notes. Hyprnote captures
            every meeting detail so nothing falls through the cracks.
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
          Built for project managers
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you deliver projects successfully.
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
          For every project meeting
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From planning to retrospectives, capture what matters at every phase.
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
          Ready to improve project delivery?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join project managers who are keeping projects on track with
          AI-powered meeting notes.
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
