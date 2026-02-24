import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/government")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Government - Hyprnote" },
      {
        name: "description",
        content:
          "Secure AI meeting notes for government agencies. Capture public meetings, inter-agency coordination, and policy discussions with privacy-first local AI processing.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Government - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Secure, compliant AI notetaking for government. Local processing keeps sensitive discussions protected while improving meeting documentation.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/government",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:shield-check",
    title: "Security First",
    description:
      "Local AI processing keeps sensitive government discussions on your secure infrastructure. No data leaves your network.",
  },
  {
    icon: "mdi:file-document-check",
    title: "Compliance Ready",
    description:
      "Self-hosting options support FedRAMP, FISMA, and other government compliance requirements.",
  },
  {
    icon: "mdi:account-multiple",
    title: "Public Meeting Records",
    description:
      "Create accurate records of public meetings, hearings, and community sessions for transparency.",
  },
  {
    icon: "mdi:handshake",
    title: "Inter-Agency Coordination",
    description:
      "Document cross-agency meetings, task force discussions, and collaborative initiatives.",
  },
  {
    icon: "mdi:magnify",
    title: "Searchable Archives",
    description:
      "Find specific discussions, decisions, or action items across all your meeting records instantly.",
  },
  {
    icon: "mdi:server-security",
    title: "Self-Hosting Available",
    description:
      "Deploy on government infrastructure for complete control over data residency and security.",
  },
];

const useCases = [
  {
    title: "Public Meetings",
    description:
      "Create accurate transcripts of town halls, council meetings, and public hearings for transparency and record-keeping.",
  },
  {
    title: "Policy Discussions",
    description:
      "Document internal policy meetings, strategy sessions, and planning discussions with comprehensive notes.",
  },
  {
    title: "Inter-Agency Coordination",
    description:
      "Capture cross-agency meetings, joint task forces, and collaborative initiatives with all stakeholders.",
  },
  {
    title: "Constituent Services",
    description:
      "Record constituent meetings and service discussions to ensure follow-through and accountability.",
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
            <Icon icon="mdi:bank" className="text-lg" />
            <span>For Government</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Secure AI notes for
            <br />
            government agencies
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Capture public meetings and policy discussions with AI that
            processes everything locally. Your sensitive data stays on your
            secure infrastructure.
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
              to="/product/self-hosting/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "border border-stone-300 text-stone-600",
                "hover:bg-stone-50 transition-colors",
              ])}
            >
              Learn about self-hosting
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
          Built for government security
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed with government security and compliance
          requirements in mind.
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
          For every government meeting
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From public hearings to internal planning, capture what matters most.
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
          Ready to improve government documentation?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join government agencies who are improving meeting documentation while
          maintaining security.
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
