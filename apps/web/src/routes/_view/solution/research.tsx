import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/research")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Researchers - Char" },
      {
        name: "description",
        content:
          "Capture interviews, observations, and research insights with AI-powered meeting notes. Analyze faster with Char.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Researchers - Char",
      },
      {
        property: "og:description",
        content:
          "Focus on discovery while AI captures every detail. Turn research conversations into actionable insights.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/research",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:microphone-variant",
    title: "Interview Recording",
    description:
      "Capture user interviews, expert conversations, and field observations. Get accurate transcriptions of every research session.",
  },
  {
    icon: "mdi:tag-multiple",
    title: "Theme Identification",
    description:
      "AI helps identify recurring themes, patterns, and insights across multiple research sessions.",
  },
  {
    icon: "mdi:format-quote-close",
    title: "Quote Extraction",
    description:
      "Easily find and extract participant quotes for reports, papers, and presentations.",
  },
  {
    icon: "mdi:file-search",
    title: "Search & Analysis",
    description:
      "Search across all your research notes to find specific topics, responses, or insights instantly.",
  },
  {
    icon: "mdi:book-open-variant",
    title: "Research Synthesis",
    description:
      "Turn raw interview data into structured findings. Support your analysis with detailed evidence.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Participant Privacy",
    description:
      "Local AI processing ensures sensitive research data and participant information stays private.",
  },
];

const useCases = [
  {
    title: "User Research",
    description:
      "Capture user interviews, usability tests, and feedback sessions. Identify patterns in user needs and behaviors.",
  },
  {
    title: "Academic Research",
    description:
      "Record research interviews, focus groups, and field observations. Support qualitative analysis with detailed transcripts.",
  },
  {
    title: "Market Research",
    description:
      "Document customer conversations, market interviews, and competitive insights. Extract themes and trends.",
  },
  {
    title: "Ethnographic Studies",
    description:
      "Capture field notes, participant observations, and contextual inquiries. Build rich qualitative datasets.",
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
            <Icon icon="mdi:flask" className="text-lg" />
            <span>For Researchers</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Discover faster with
            <br />
            AI-powered meeting notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Focus on asking questions and observing while Char captures every
            detail, identifies themes, and helps you analyze research
            conversations.
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
          Built for research excellence
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you capture, analyze, and synthesize
          research insights.
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
          For every research method
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Whatever your research approach, Char helps you capture and analyze
          every conversation.
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
          Ready to accelerate your research?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join researchers who are discovering faster with AI-powered meeting
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
