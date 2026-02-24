import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/recruiting")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Recruiting - Hyprnote" },
      {
        name: "description",
        content:
          "Capture every candidate interview with AI-powered meeting notes. Get structured feedback, compare candidates objectively, and make better hiring decisions with Hyprnote.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Recruiting - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Never miss candidate insights. AI-powered interview notes capture responses, assess skills, and help you make data-driven hiring decisions.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/recruiting",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:account-search",
    title: "Capture Every Response",
    description:
      "Record candidate interviews and get complete transcriptions. Never miss important answers or red flags.",
  },
  {
    icon: "mdi:clipboard-check",
    title: "Structured Feedback",
    description:
      "AI extracts key competencies, skills mentioned, and cultural fit indicators from every interview.",
  },
  {
    icon: "mdi:scale-balance",
    title: "Objective Comparison",
    description:
      "Compare candidates fairly with consistent documentation. Reduce bias with comprehensive interview records.",
  },
  {
    icon: "mdi:share-variant",
    title: "Team Collaboration",
    description:
      "Share interview summaries with hiring managers and team members. Keep everyone aligned on candidate assessments.",
  },
  {
    icon: "mdi:clock-fast",
    title: "Faster Decisions",
    description:
      "Review interview highlights quickly. Make hiring decisions faster with AI-generated summaries and key points.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Candidate Privacy",
    description:
      "Local AI processing keeps sensitive candidate information secure. Control what gets shared and stored.",
  },
];

const useCases = [
  {
    title: "Phone Screens",
    description:
      "Capture initial screening calls efficiently. Identify qualified candidates quickly with AI-extracted highlights.",
  },
  {
    title: "Technical Interviews",
    description:
      "Document technical discussions, coding explanations, and problem-solving approaches for thorough evaluation.",
  },
  {
    title: "Panel Interviews",
    description:
      "Record multi-interviewer sessions and consolidate feedback from all participants in one place.",
  },
  {
    title: "Hiring Committee Reviews",
    description:
      "Share comprehensive interview documentation with hiring committees for informed decision-making.",
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
            <Icon icon="mdi:account-tie" className="text-lg" />
            <span>For Recruiting Teams</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Hire better with
            <br />
            AI-powered interview notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Focus on the candidate, not your notepad. Hyprnote captures every
            interview detail so you can make better hiring decisions.
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
          Built for recruiting excellence
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you find and hire the best talent.
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
          For every interview stage
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From first screen to final round, capture what matters at every step.
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
          Ready to transform your hiring process?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join recruiting teams who are making better hiring decisions with
          AI-powered interview notes.
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
