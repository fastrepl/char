import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/sales")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Sales Teams - Hyprnote" },
      {
        name: "description",
        content:
          "Capture every sales call detail with AI-powered meeting notes. Get automatic transcriptions, deal insights, and CRM-ready summaries. Close more deals with Hyprnote.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Sales Teams - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Never miss a sales opportunity. AI-powered meeting notes capture every detail, extract action items, and help you close deals faster.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/sales",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:microphone",
    title: "Capture Every Detail",
    description:
      "Record sales calls and demos automatically. Never miss pricing discussions, objections, or buying signals.",
  },
  {
    icon: "mdi:text-box-check",
    title: "Deal Intelligence",
    description:
      "AI extracts key deal information, competitor mentions, budget discussions, and decision-maker insights.",
  },
  {
    icon: "mdi:clipboard-list",
    title: "Action Items & Follow-ups",
    description:
      "Automatically identify next steps, commitments, and follow-up tasks from every sales conversation.",
  },
  {
    icon: "mdi:chart-timeline-variant",
    title: "Sales Coaching Insights",
    description:
      "Review call recordings to improve pitch delivery, objection handling, and closing techniques.",
  },
  {
    icon: "mdi:share-variant",
    title: "Team Collaboration",
    description:
      "Share call summaries with your team. Keep everyone aligned on deal progress and customer needs.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Privacy-First",
    description:
      "Your sales conversations stay private. Local AI processing means sensitive deal data never leaves your device.",
  },
];

const useCases = [
  {
    title: "Discovery Calls",
    description:
      "Capture prospect pain points, requirements, and buying criteria. Build comprehensive customer profiles from every conversation.",
  },
  {
    title: "Product Demos",
    description:
      "Focus on delivering great demos while AI captures questions, feature requests, and areas of interest.",
  },
  {
    title: "Negotiation Calls",
    description:
      "Track pricing discussions, contract terms, and stakeholder concerns. Never forget what was agreed upon.",
  },
  {
    title: "QBRs & Account Reviews",
    description:
      "Document customer feedback, renewal discussions, and expansion opportunities with detailed meeting notes.",
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
            <Icon icon="mdi:briefcase" className="text-lg" />
            <span>For Sales Teams</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Close more deals with
            <br />
            AI-powered meeting notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Stop taking notes during sales calls. Focus on building
            relationships while Hyprnote captures every detail, extracts
            insights, and prepares your follow-ups.
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
          Built for sales professionals
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you sell more effectively and close
          deals faster.
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
          For every sales conversation
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From first touch to closed-won, Hyprnote helps you capture and act on
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
          Ready to supercharge your sales?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join sales teams who are closing more deals with AI-powered meeting
          notes.
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
