import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/free")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Free AI Meeting Notes - Hyprnote" },
      {
        name: "description",
        content:
          "Get powerful AI meeting notes completely free. Record meetings, transcribe audio, generate summaries, and more. No credit card required. Local AI processing for complete privacy.",
      },
      {
        property: "og:title",
        content: "Free AI Meeting Notes - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Hyprnote offers free AI-powered meeting transcription and notes. Local processing, unlimited recordings, and no usage limits. Download now.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/free" },
    ],
  }),
});

const freeFeatures = [
  {
    icon: "mdi:microphone",
    title: "Unlimited Recording",
    description:
      "Record as many meetings as you want with no time limits or restrictions. Your meetings, your data.",
  },
  {
    icon: "mdi:text-recognition",
    title: "AI Transcription",
    description:
      "Get accurate transcriptions powered by local Whisper models. Works offline with no cloud uploads.",
  },
  {
    icon: "mdi:file-document-edit",
    title: "Smart Summaries",
    description:
      "Generate intelligent meeting summaries with action items, decisions, and key points automatically.",
  },
  {
    icon: "mdi:calendar-sync",
    title: "Calendar Integration",
    description:
      "Connect Apple Calendar, Google Calendar, or Outlook to automatically organize your meeting notes.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Complete Privacy",
    description:
      "All processing happens locally on your device. Your conversations never leave your computer.",
  },
  {
    icon: "mdi:cloud-off",
    title: "Works Offline",
    description:
      "No internet required for core features. Record, transcribe, and summarize without connectivity.",
  },
];

const comparisonFeatures = [
  { feature: "Meeting recording", hyprnote: true, others: "Limited" },
  { feature: "AI transcription", hyprnote: true, others: "Paid" },
  { feature: "Meeting summaries", hyprnote: true, others: "Paid" },
  { feature: "Local AI processing", hyprnote: true, others: false },
  { feature: "Offline support", hyprnote: true, others: false },
  { feature: "Calendar integration", hyprnote: true, others: "Limited" },
  { feature: "Custom templates", hyprnote: true, others: "Paid" },
  { feature: "No usage limits", hyprnote: true, others: false },
  { feature: "Open source", hyprnote: true, others: false },
  { feature: "Self-hosting option", hyprnote: true, others: false },
];

const useCases = [
  {
    icon: "mdi:briefcase",
    title: "Sales Calls",
    description:
      "Never miss a detail from prospect conversations. Get automatic summaries with next steps and objections.",
  },
  {
    icon: "mdi:school",
    title: "Lectures & Classes",
    description:
      "Record lectures and get organized notes. Perfect for students who want to focus on learning.",
  },
  {
    icon: "mdi:account-group",
    title: "Team Meetings",
    description:
      "Keep everyone aligned with shared meeting notes. Track decisions and action items automatically.",
  },
  {
    icon: "mdi:lightbulb",
    title: "Brainstorming",
    description:
      "Capture every idea during creative sessions. Let AI organize and categorize your thoughts.",
  },
  {
    icon: "mdi:phone",
    title: "Client Calls",
    description:
      "Document client requirements and feedback accurately. Build better relationships with detailed records.",
  },
  {
    icon: "mdi:medical-bag",
    title: "Healthcare",
    description:
      "HIPAA-ready with local processing. Perfect for patient consultations and medical documentation.",
  },
];

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <FeaturesSection />
        <ComparisonSection />
        <UseCasesSection />
        <OpenSourceSection />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-16 lg:py-24">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-medium mb-6">
          <Icon icon="mdi:gift" className="text-lg" />
          <span>100% Free Forever</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-600 mb-6">
          AI meeting notes
          <br />
          <span className="text-stone-400">without the price tag</span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
          Record meetings, get AI transcriptions, and generate smart summaries.
          All for free, with no usage limits and complete privacy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/download/"
            className={cn([
              "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform",
            ])}
          >
            <Icon icon="mdi:download" className="text-xl" />
            Download Free
          </Link>
          <Link
            to="/product/ai-notetaking/"
            className={cn([
              "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
              "border border-neutral-300 text-neutral-700",
              "hover:bg-neutral-50 transition-colors",
            ])}
          >
            See Features
          </Link>
        </div>
        <p className="mt-6 text-sm text-neutral-500">
          No credit card required. No account needed to start.
        </p>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="px-6 py-16 lg:py-20 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
            Everything you need, free
          </h2>
          <p className="text-lg text-neutral-600">
            No hidden costs, no premium tiers for essential features
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {freeFeatures.map((feature) => (
            <div
              key={feature.title}
              className="p-6 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
            >
              <Icon
                icon={feature.icon}
                className="text-3xl text-stone-600 mb-4"
              />
              <h3 className="text-lg font-medium text-stone-700 mb-2">
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

function ComparisonSection() {
  return (
    <section className="px-6 py-16 lg:py-20 bg-stone-50/50 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
            More value than paid alternatives
          </h2>
          <p className="text-lg text-neutral-600">
            See how Hyprnote compares to other meeting note tools
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 bg-stone-100 border-b border-neutral-200">
            <div className="p-4 font-medium text-stone-700">Feature</div>
            <div className="p-4 font-medium text-stone-700 text-center border-x border-neutral-200">
              <span className="text-stone-600">Hyprnote</span>
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Free
              </span>
            </div>
            <div className="p-4 font-medium text-neutral-500 text-center">
              Others
            </div>
          </div>
          {comparisonFeatures.map((row, index) => (
            <div
              key={row.feature}
              className={cn([
                "grid grid-cols-3",
                index !== comparisonFeatures.length - 1 &&
                  "border-b border-neutral-100",
              ])}
            >
              <div className="p-4 text-neutral-700 text-sm">{row.feature}</div>
              <div className="p-4 text-center border-x border-neutral-100">
                {row.hyprnote === true ? (
                  <Icon
                    icon="mdi:check-circle"
                    className="text-xl text-green-600"
                  />
                ) : (
                  <span className="text-sm text-neutral-500">
                    {row.hyprnote}
                  </span>
                )}
              </div>
              <div className="p-4 text-center">
                {row.others === true ? (
                  <Icon
                    icon="mdi:check-circle"
                    className="text-xl text-green-600"
                  />
                ) : row.others === false ? (
                  <Icon
                    icon="mdi:close-circle"
                    className="text-xl text-red-400"
                  />
                ) : (
                  <span className="text-sm text-neutral-500">{row.others}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section className="px-6 py-16 lg:py-20 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
            Built for every conversation
          </h2>
          <p className="text-lg text-neutral-600">
            From sales calls to lectures, Hyprnote adapts to your needs
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="p-6 bg-stone-50/50 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <Icon
                icon={useCase.icon}
                className="text-3xl text-stone-500 mb-4"
              />
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

function OpenSourceSection() {
  return (
    <section className="px-6 py-16 lg:py-20 bg-stone-50/50 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full text-stone-600 text-sm font-medium mb-4">
              <Icon icon="mdi:github" className="text-lg" />
              <span>Open Source</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
              Transparent by design
            </h2>
            <p className="text-neutral-600 mb-6 leading-relaxed">
              Hyprnote is fully open source. Inspect the code, contribute
              improvements, or self-host on your own infrastructure. No vendor
              lock-in, no hidden data collection.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/fastrepl/hyprnote"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full",
                  "bg-stone-800 text-white",
                  "hover:bg-stone-700 transition-colors",
                ])}
              >
                <Icon icon="mdi:github" className="text-lg" />
                View on GitHub
              </a>
              <Link
                to="/product/self-hosting/"
                className={cn([
                  "inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full",
                  "border border-neutral-300 text-neutral-700",
                  "hover:bg-neutral-50 transition-colors",
                ])}
              >
                Self-hosting Guide
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-white border border-neutral-200 rounded-lg text-center">
              <div className="text-3xl font-serif text-stone-600 mb-1">
                100%
              </div>
              <div className="text-sm text-neutral-600">Open Source</div>
            </div>
            <div className="p-6 bg-white border border-neutral-200 rounded-lg text-center">
              <div className="text-3xl font-serif text-stone-600 mb-1">0</div>
              <div className="text-sm text-neutral-600">Data Collection</div>
            </div>
            <div className="p-6 bg-white border border-neutral-200 rounded-lg text-center">
              <div className="text-3xl font-serif text-stone-600 mb-1">
                Local
              </div>
              <div className="text-sm text-neutral-600">AI Processing</div>
            </div>
            <div className="p-6 bg-white border border-neutral-200 rounded-lg text-center">
              <div className="text-3xl font-serif text-stone-600 mb-1">
                Free
              </div>
              <div className="text-sm text-neutral-600">Forever</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-16 lg:py-24 border-t border-neutral-100">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
          Ready to try Hyprnote?
        </h2>
        <p className="text-lg text-neutral-600 mb-8">
          Download now and start capturing better meeting notes in minutes. No
          signup required.
        </p>
        <Link
          to="/download/"
          className={cn([
            "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          <Icon icon="mdi:download" className="text-xl" />
          Download for Free
        </Link>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
          <span className="flex items-center gap-2">
            <Icon icon="mdi:apple" className="text-lg" />
            macOS
          </span>
          <span className="flex items-center gap-2">
            <Icon icon="mdi:linux" className="text-lg" />
            Linux
          </span>
          <span className="flex items-center gap-2">
            <Icon icon="mdi:microsoft-windows" className="text-lg" />
            Windows (coming soon)
          </span>
        </div>
      </div>
    </section>
  );
}
