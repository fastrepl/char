import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/healthcare")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Healthcare - Hyprnote" },
      {
        name: "description",
        content:
          "HIPAA-ready AI meeting notes for healthcare professionals. Capture patient consultations, clinical meetings, and care coordination with privacy-first local AI processing.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Healthcare - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Privacy-first AI notetaking for healthcare. Local processing keeps patient data secure while capturing clinical discussions and care coordination meetings.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/healthcare",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:shield-check",
    title: "Privacy-First Design",
    description:
      "Local AI processing keeps sensitive patient information on your device. No data leaves your system without your explicit consent.",
  },
  {
    icon: "mdi:microphone",
    title: "Clinical Documentation",
    description:
      "Capture patient consultations, care team meetings, and clinical discussions with accurate transcription.",
  },
  {
    icon: "mdi:clipboard-pulse",
    title: "Care Coordination",
    description:
      "Document handoffs, multidisciplinary team meetings, and care planning sessions with comprehensive notes.",
  },
  {
    icon: "mdi:account-group",
    title: "Team Collaboration",
    description:
      "Share meeting summaries with care teams while maintaining appropriate access controls and privacy.",
  },
  {
    icon: "mdi:clock-outline",
    title: "Time Savings",
    description:
      "Reduce documentation burden so clinicians can focus more time on patient care instead of paperwork.",
  },
  {
    icon: "mdi:server-security",
    title: "Self-Hosting Option",
    description:
      "Deploy on your own infrastructure for complete control over data residency and compliance requirements.",
  },
];

const useCases = [
  {
    title: "Patient Consultations",
    description:
      "Capture key discussion points, treatment plans, and follow-up actions from patient meetings without breaking eye contact.",
  },
  {
    title: "Care Team Meetings",
    description:
      "Document multidisciplinary rounds, case conferences, and care coordination discussions with all stakeholders.",
  },
  {
    title: "Administrative Meetings",
    description:
      "Track departmental meetings, quality improvement discussions, and operational planning sessions.",
  },
  {
    title: "Training & Education",
    description:
      "Record educational sessions, grand rounds, and training meetings for future reference and learning.",
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
            <Icon icon="mdi:hospital-building" className="text-lg" />
            <span>For Healthcare</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Privacy-first AI notes
            <br />
            for healthcare teams
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Capture clinical meetings and patient discussions with AI that
            processes everything locally. Your patient data never leaves your
            device.
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
          Built for healthcare privacy
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed with patient privacy and clinical workflows in
          mind.
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
          For every clinical conversation
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          From patient consultations to team meetings, capture what matters
          most.
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
          Ready to streamline clinical documentation?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join healthcare teams who are saving time on documentation while
          maintaining patient privacy.
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
