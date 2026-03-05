import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/free")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Free AI Meeting Notes - Char" },
      {
        name: "description",
        content:
          "Free AI meeting notes. Record, transcribe, and summarize locally on your device. No credit card, no account needed.",
      },
      {
        property: "og:title",
        content: "Free AI Meeting Notes - Char",
      },
      {
        property: "og:description",
        content:
          "Free meeting transcription and notes. Runs locally, no recording limits. Download now.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://char.com/free" },
    ],
  }),
});

const freeFeatures = [
  {
    icon: "mdi:microphone",
    title: "Unlimited Recording",
    description:
      "No recording limits. No time caps. Record as much as you need.",
  },
  {
    icon: "mdi:text-recognition",
    title: "AI Transcription",
    description:
      "Transcription runs on Whisper, locally on your machine. Works offline, nothing uploaded.",
  },
  {
    icon: "mdi:file-document-edit",
    title: "Smart Summaries",
    description:
      "Summaries pull out what matters: action items, decisions, the stuff you'd otherwise dig through the transcript for.",
  },
  {
    icon: "mdi:calendar-sync",
    title: "Calendar Integration",
    description:
      "Connect Apple Calendar, Google Calendar, or Outlook. Meeting notes get organized automatically.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Complete Privacy",
    description:
      "Everything runs on your device. Your conversations never leave your computer.",
  },
  {
    icon: "mdi:cloud-off",
    title: "Works Offline",
    description:
      "No internet needed. Record, transcribe, and summarize without connectivity.",
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
      "Summaries with next steps and objections pulled out. Stop scribbling during discovery calls.",
  },
  {
    icon: "mdi:school",
    title: "Lectures & Classes",
    description:
      "Record the lecture, focus on learning. Notes and transcript are waiting when you're done.",
  },
  {
    icon: "mdi:account-group",
    title: "Team Meetings",
    description:
      'Shared notes with decisions and action items. No more "what did we agree on?" messages.',
  },
  {
    icon: "mdi:lightbulb",
    title: "Brainstorming",
    description:
      "Record the session, let AI organize what came up. Nothing gets lost in the whiteboard chaos.",
  },
  {
    icon: "mdi:phone",
    title: "Client Calls",
    description:
      "Accurate records of requirements and feedback. Useful when the client remembers it differently.",
  },
  {
    icon: "mdi:medical-bag",
    title: "Healthcare",
    description:
      "HIPAA-ready. Everything runs locally, nothing leaves the device. Good for patient consultations.",
  },
];

function Component() {
  return (
    <div
      className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="mx-auto max-w-6xl border-x border-neutral-100 bg-white">
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
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
          <Icon icon="mdi:gift" className="text-lg" />
          <span>100% Free Forever</span>
        </div>
        <h1 className="mb-6 font-serif text-4xl tracking-tight text-stone-700 sm:text-5xl lg:text-6xl">
          AI meeting notes
          <br />
          <span className="text-stone-400">without the price tag</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-neutral-600 sm:text-xl">
          Record meetings, transcribe them, get summaries. Free, no limits, runs
          on your device.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/download/"
            className={cn([
              "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base font-medium",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "transition-transform hover:scale-105 active:scale-95",
            ])}
          >
            <Icon icon="mdi:download" className="text-xl" />
            Download Free
          </Link>
          <Link
            to="/product/ai-notetaking/"
            className={cn([
              "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base font-medium",
              "border border-neutral-300 text-neutral-700",
              "transition-colors hover:bg-neutral-50",
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
    <section className="border-t border-neutral-100 px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-serif text-3xl text-stone-700 sm:text-4xl">
            Free. Actually free.
          </h2>
          <p className="text-lg text-neutral-600">
            No catch. The free version does real work.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {freeFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-neutral-200 p-6 transition-colors hover:border-neutral-300"
            >
              <Icon
                icon={feature.icon}
                className="mb-4 text-3xl text-stone-700"
              />
              <h3 className="mb-2 text-lg font-medium text-stone-700">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
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
    <section className="border-t border-neutral-100 bg-stone-50/50 px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-serif text-3xl text-stone-700 sm:text-4xl">
            Better than what you're paying for
          </h2>
          <p className="text-lg text-neutral-600">
            How Char stacks up against paid meeting note tools
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="grid grid-cols-3 border-b border-neutral-200 bg-stone-100">
            <div className="p-4 font-medium text-stone-700">Feature</div>
            <div className="border-x border-neutral-200 p-4 text-center font-medium text-stone-700">
              <span className="text-stone-700">Char</span>
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Free
              </span>
            </div>
            <div className="p-4 text-center font-medium text-neutral-500">
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
              <div className="p-4 text-sm text-neutral-700">{row.feature}</div>
              <div className="border-x border-neutral-100 p-4 text-center">
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
    <section className="border-t border-neutral-100 px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-serif text-3xl text-stone-700 sm:text-4xl">
            Works for more than just meetings
          </h2>
          <p className="text-lg text-neutral-600">
            Sales calls, lectures, 1-on-1s, whatever.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-lg bg-stone-50/50 p-6 transition-colors hover:bg-stone-50"
            >
              <Icon
                icon={useCase.icon}
                className="mb-4 text-3xl text-stone-500"
              />
              <h3 className="mb-2 text-lg font-medium text-stone-700">
                {useCase.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
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
    <section className="border-t border-neutral-100 bg-stone-50/50 px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
              <Icon icon="mdi:github" className="text-lg" />
              <span>Open Source</span>
            </div>
            <h2 className="mb-4 font-serif text-3xl text-stone-700 sm:text-4xl">
              Transparent by design
            </h2>
            <p className="mb-6 leading-relaxed text-neutral-600">
              Char is fully open source. Read the code, contribute to it, or
              self-host on your own servers. Nothing hidden.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/fastrepl/char"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium",
                  "bg-stone-800 text-white",
                  "transition-colors hover:bg-stone-700",
                ])}
              >
                <Icon icon="mdi:github" className="text-lg" />
                View on GitHub
              </a>
              <Link
                to="/product/self-hosting/"
                className={cn([
                  "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium",
                  "border border-neutral-300 text-neutral-700",
                  "transition-colors hover:bg-neutral-50",
                ])}
              >
                Self-hosting Guide
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
              <div className="mb-1 font-serif text-3xl text-stone-700">
                100%
              </div>
              <div className="text-sm text-neutral-600">Open Source</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
              <div className="mb-1 font-serif text-3xl text-stone-700">0</div>
              <div className="text-sm text-neutral-600">Data Collection</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
              <div className="mb-1 font-serif text-3xl text-stone-700">
                Local
              </div>
              <div className="text-sm text-neutral-600">AI Processing</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
              <div className="mb-1 font-serif text-3xl text-stone-700">
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
    <section className="border-t border-neutral-100 px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 font-serif text-3xl text-stone-700 sm:text-4xl">
          Ready to try Char?
        </h2>
        <p className="mb-8 text-lg text-neutral-600">
          Download it. No account needed.
        </p>
        <Link
          to="/download/"
          className={cn([
            "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base font-medium",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "transition-transform hover:scale-105 active:scale-95",
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
