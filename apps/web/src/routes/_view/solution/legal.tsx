import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/legal")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Legal Teams - Hyprnote" },
      {
        name: "description",
        content:
          "Confidential AI meeting notes for legal professionals. Capture client consultations, depositions, and case discussions with privacy-first local AI processing.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Legal Teams - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Attorney-client privilege protected. Local AI processing keeps confidential legal discussions secure while capturing every important detail.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/legal",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:shield-lock",
    title: "Confidentiality First",
    description:
      "Local AI processing ensures attorney-client privileged communications never leave your device or network.",
  },
  {
    icon: "mdi:microphone",
    title: "Accurate Transcription",
    description:
      "Capture client meetings, depositions, and case discussions with precise transcription for your records.",
  },
  {
    icon: "mdi:file-document-outline",
    title: "Case Documentation",
    description:
      "Build comprehensive case files with detailed meeting notes, action items, and key discussion points.",
  },
  {
    icon: "mdi:clock-outline",
    title: "Billable Time Tracking",
    description:
      "Accurate meeting records help with time tracking and billing documentation for client matters.",
  },
  {
    icon: "mdi:magnify",
    title: "Searchable Archives",
    description:
      "Find specific discussions, decisions, or commitments across all your case-related meetings instantly.",
  },
  {
    icon: "mdi:server-security",
    title: "Self-Hosting Available",
    description:
      "Deploy on your firm's infrastructure for complete control over data residency and compliance.",
  },
];

const useCases = [
  {
    title: "Client Consultations",
    description:
      "Capture initial consultations and ongoing client meetings with complete confidentiality and accuracy.",
  },
  {
    title: "Case Strategy Sessions",
    description:
      "Document internal case discussions, strategy planning, and team deliberations for comprehensive records.",
  },
  {
    title: "Witness Interviews",
    description:
      "Record and transcribe witness interviews with accurate documentation for case preparation.",
  },
  {
    title: "Partner & Team Meetings",
    description:
      "Track firm meetings, case assignments, and administrative discussions with detailed notes.",
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
            <Icon icon="mdi:scale-balance" className="text-lg" />
            <span>For Legal Teams</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Confidential AI notes
            <br />
            for legal professionals
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Capture every client meeting and case discussion with AI that
            processes everything locally. Your privileged communications stay
            protected.
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
          Built for legal confidentiality
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed with attorney-client privilege and legal
          workflows in mind.
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
          For every legal conversation
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From client consultations to case strategy, capture what matters most.
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
          Ready to streamline legal documentation?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join legal teams who are saving time on documentation while
          maintaining client confidentiality.
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
