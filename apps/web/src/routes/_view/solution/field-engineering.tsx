import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/field-engineering")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Field Engineering - Hyprnote" },
      {
        name: "description",
        content:
          "Capture technical discussions and customer meetings on the go with AI-powered meeting notes. Document implementations, troubleshooting, and field visits with Hyprnote.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Field Engineering - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Never miss technical details. AI-powered meeting notes capture implementations, troubleshooting sessions, and customer discussions for field engineers.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/field-engineering",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:wrench",
    title: "Technical Documentation",
    description:
      "Capture implementation details, configuration discussions, and technical decisions during customer visits.",
  },
  {
    icon: "mdi:bug",
    title: "Troubleshooting Records",
    description:
      "Document debugging sessions, root cause analyses, and resolution steps for future reference.",
  },
  {
    icon: "mdi:account-hard-hat",
    title: "On-Site Meetings",
    description:
      "Record customer meetings, site assessments, and technical reviews even in challenging environments.",
  },
  {
    icon: "mdi:share-variant",
    title: "Knowledge Sharing",
    description:
      "Share detailed technical notes with your team. Build a knowledge base from field experiences.",
  },
  {
    icon: "mdi:wifi-off",
    title: "Offline Capable",
    description:
      "Local AI processing works without internet. Capture meetings anywhere, sync when connected.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Customer Privacy",
    description:
      "Local processing keeps sensitive customer infrastructure details secure on your device.",
  },
];

const useCases = [
  {
    title: "Implementation Meetings",
    description:
      "Document deployment discussions, configuration decisions, and integration requirements during customer implementations.",
  },
  {
    title: "Technical Support Calls",
    description:
      "Capture troubleshooting sessions, diagnostic findings, and resolution steps for complex technical issues.",
  },
  {
    title: "Site Assessments",
    description:
      "Record site survey findings, infrastructure evaluations, and technical recommendations for customers.",
  },
  {
    title: "Training Sessions",
    description:
      "Document customer training sessions, Q&A discussions, and follow-up action items.",
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
            <Icon icon="mdi:tools" className="text-lg" />
            <span>For Field Engineering</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Capture technical details
            <br />
            anywhere you work
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            From customer sites to remote locations, Hyprnote captures your
            technical discussions with AI that works offline.
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
              to="/product/local-ai/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "border border-stone-300 text-stone-600",
                "hover:bg-stone-50 transition-colors",
              ])}
            >
              Learn about local AI
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
          Built for field engineers
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed for technical work in the field.
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
          For every field engagement
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From implementations to support calls, capture what matters most.
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
          Ready to improve field documentation?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join field engineers who are capturing every technical detail with
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
