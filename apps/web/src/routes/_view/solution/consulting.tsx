import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/consulting")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Consultants - Char" },
      {
        name: "description",
        content:
          "Capture client conversations, project details, and strategic insights with AI-powered meeting notes. Deliver better recommendations with Char.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Consultants - Char",
      },
      {
        property: "og:description",
        content:
          "Focus on advising clients while AI captures every detail. Turn meeting notes into actionable insights and deliverables.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/consulting",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:briefcase-check",
    title: "Client Meeting Capture",
    description:
      "Record client discussions, requirements, and strategic priorities. Keep detailed records of every engagement.",
  },
  {
    icon: "mdi:lightbulb",
    title: "Insight Extraction",
    description:
      "AI identifies key themes, pain points, and opportunities from client conversations to inform your recommendations.",
  },
  {
    icon: "mdi:file-document-multiple",
    title: "Deliverable Support",
    description:
      "Turn meeting notes into reports, presentations, and recommendations. Extract quotes and data points for your deliverables.",
  },
  {
    icon: "mdi:account-group",
    title: "Stakeholder Management",
    description:
      "Track different stakeholder perspectives, concerns, and priorities across multiple conversations.",
  },
  {
    icon: "mdi:clock-check",
    title: "Billable Hours",
    description:
      "Accurate meeting records support time tracking and billing documentation for client engagements.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Client Confidentiality",
    description:
      "Local AI processing ensures sensitive client information stays private and secure on your device.",
  },
];

const useCases = [
  {
    title: "Discovery & Scoping",
    description:
      "Capture project requirements, success criteria, and constraints. Build comprehensive understanding of client needs.",
  },
  {
    title: "Strategy Sessions",
    description:
      "Document strategic discussions, decision rationale, and alignment points. Create clear records of recommendations.",
  },
  {
    title: "Stakeholder Interviews",
    description:
      "Record perspectives from different stakeholders. Identify patterns and conflicts across the organization.",
  },
  {
    title: "Status Updates & Reviews",
    description:
      "Track project progress, client feedback, and change requests. Maintain detailed engagement history.",
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
            <Icon icon="mdi:briefcase-account" className="text-lg" />
            <span>For Consultants</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Deliver better insights with
            <br />
            AI-powered meeting notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Focus on advising your clients while Char captures every detail,
            extracts insights, and helps you create compelling deliverables.
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
          Built for consulting excellence
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you deliver exceptional client value
          and insights.
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
          For every client engagement
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From discovery to delivery, Char helps you capture and leverage every
          client interaction.
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
          Ready to elevate your consulting?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join consultants who are delivering better insights with AI-powered
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
