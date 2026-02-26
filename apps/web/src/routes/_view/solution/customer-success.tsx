import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/customer-success")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Customer Success - Char" },
      {
        name: "description",
        content:
          "Capture every customer conversation with AI-powered meeting notes. Track health signals, document feedback, and drive retention with Char.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Customer Success - Char",
      },
      {
        property: "og:description",
        content:
          "Never miss customer insights. AI-powered meeting notes capture feedback, track health signals, and help you drive customer retention.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/solution/customer-success",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:heart-pulse",
    title: "Track Health Signals",
    description:
      "AI identifies customer sentiment, concerns, and satisfaction indicators from every conversation.",
  },
  {
    icon: "mdi:message-text",
    title: "Capture Feedback",
    description:
      "Document feature requests, pain points, and product feedback to share with your product team.",
  },
  {
    icon: "mdi:clipboard-check",
    title: "Action Items",
    description:
      "Automatically extract commitments, follow-ups, and action items from customer meetings.",
  },
  {
    icon: "mdi:chart-line",
    title: "Renewal Preparation",
    description:
      "Build comprehensive account histories to prepare for renewal conversations and expansion opportunities.",
  },
  {
    icon: "mdi:share-variant",
    title: "Team Handoffs",
    description:
      "Share detailed meeting notes for smooth handoffs between CSMs and across account teams.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Customer Privacy",
    description:
      "Local AI processing keeps sensitive customer conversations secure. Control what gets shared and stored.",
  },
];

const useCases = [
  {
    title: "Onboarding Calls",
    description:
      "Document onboarding sessions, training discussions, and implementation meetings for successful customer launches.",
  },
  {
    title: "QBRs & Business Reviews",
    description:
      "Capture quarterly business reviews, success metrics discussions, and strategic planning sessions.",
  },
  {
    title: "Support Escalations",
    description:
      "Record escalation calls and resolution discussions. Build comprehensive case histories for complex issues.",
  },
  {
    title: "Renewal Conversations",
    description:
      "Document renewal discussions, contract negotiations, and expansion conversations with complete accuracy.",
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-700 text-sm mb-6">
            <Icon icon="mdi:account-heart" className="text-lg" />
            <span>For Customer Success</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700 mb-6">
            Drive retention with
            <br />
            AI-powered meeting notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Focus on your customers, not your notepad. Char captures every
            conversation detail so you can drive success and retention.
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
                "border border-stone-300 text-stone-700",
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
        <h2 className="text-3xl font-serif text-stone-700 text-center mb-4">
          Built for customer success
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you understand and retain your
          customers.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                <Icon icon={feature.icon} className="text-2xl text-stone-700" />
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
        <h2 className="text-3xl font-serif text-stone-700 text-center mb-4">
          For every customer interaction
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From onboarding to renewal, capture what matters at every touchpoint.
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
        <h2 className="text-3xl font-serif text-stone-700 mb-4">
          Ready to improve customer retention?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join customer success teams who are driving retention with AI-powered
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
