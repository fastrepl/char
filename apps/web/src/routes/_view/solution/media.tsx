import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/media")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Media & Entertainment - Hyprnote" },
      {
        name: "description",
        content:
          "Capture creative meetings, production calls, and editorial discussions with AI-powered meeting notes. Streamline content production workflows with Hyprnote.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Media & Entertainment - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Never miss creative ideas. AI-powered meeting notes capture brainstorms, production discussions, and editorial meetings for media teams.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/media",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:lightbulb-on",
    title: "Capture Creative Ideas",
    description:
      "Record brainstorming sessions and creative meetings. Never lose brilliant ideas that come up in the moment.",
  },
  {
    icon: "mdi:movie-open",
    title: "Production Coordination",
    description:
      "Document production meetings, scheduling discussions, and logistics planning with comprehensive notes.",
  },
  {
    icon: "mdi:pencil",
    title: "Editorial Workflows",
    description:
      "Track editorial meetings, content reviews, and approval discussions with accurate transcription.",
  },
  {
    icon: "mdi:account-group",
    title: "Team Collaboration",
    description:
      "Share meeting summaries with creative teams, producers, and stakeholders to keep everyone aligned.",
  },
  {
    icon: "mdi:magnify",
    title: "Searchable Archives",
    description:
      "Find specific creative discussions, decisions, or feedback across all your project meetings instantly.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Protect Creative IP",
    description:
      "Local AI processing keeps sensitive creative content and unreleased projects secure on your device.",
  },
];

const useCases = [
  {
    title: "Creative Brainstorms",
    description:
      "Capture every idea from creative sessions. Review and develop concepts that emerged during collaborative discussions.",
  },
  {
    title: "Production Meetings",
    description:
      "Document production schedules, resource allocation, and logistics discussions for smooth project execution.",
  },
  {
    title: "Client Reviews",
    description:
      "Record client feedback sessions and approval meetings. Track revisions and sign-offs accurately.",
  },
  {
    title: "Post-Production",
    description:
      "Capture editing notes, color correction discussions, and final review feedback for quality delivery.",
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
            <Icon icon="mdi:movie" className="text-lg" />
            <span>For Media & Entertainment</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Capture every creative idea
            <br />
            with AI-powered notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            From brainstorms to production calls, Hyprnote captures your
            creative discussions so no brilliant idea gets lost.
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
          Built for creative teams
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to support creative workflows and content
          production.
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
          For every production phase
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From concept to delivery, capture what matters at every stage.
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
          Ready to streamline your creative workflow?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join media teams who are capturing every creative idea with AI-powered
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
