import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/coaching")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Meeting Notes for Coaches - Char" },
      {
        name: "description",
        content:
          "Capture coaching sessions, client progress, and breakthrough moments with AI-powered meeting notes. Focus on your clients with Char.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "AI Meeting Notes for Coaches - Char",
      },
      {
        property: "og:description",
        content:
          "Be fully present with your clients while AI captures every insight. Track progress and deliver transformational coaching.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/solution/coaching",
      },
    ],
  }),
});

const features = [
  {
    icon: "mdi:account-heart",
    title: "Full Presence",
    description:
      "Stop taking notes during sessions. Be fully present and engaged with your clients while AI captures everything.",
  },
  {
    icon: "mdi:chart-line",
    title: "Progress Tracking",
    description:
      "Track client goals, commitments, and breakthroughs across sessions. See patterns and progress over time.",
  },
  {
    icon: "mdi:lightbulb-on",
    title: "Insight Capture",
    description:
      "AI identifies key themes, mindset shifts, and breakthrough moments from coaching conversations.",
  },
  {
    icon: "mdi:clipboard-check",
    title: "Action Items",
    description:
      "Automatically extract commitments, homework, and action items from each session for follow-up.",
  },
  {
    icon: "mdi:message-reply-text",
    title: "Session Summaries",
    description:
      "Generate session summaries to share with clients. Help them remember key insights and next steps.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Client Privacy",
    description:
      "Local AI processing ensures sensitive coaching conversations stay completely private and secure.",
  },
];

const useCases = [
  {
    title: "Life Coaching",
    description:
      "Capture personal goals, challenges, and transformation journeys. Track client progress toward their vision.",
  },
  {
    title: "Executive Coaching",
    description:
      "Document leadership challenges, strategic thinking, and professional development goals. Support high-stakes growth.",
  },
  {
    title: "Career Coaching",
    description:
      "Track career goals, skill development, and job search progress. Help clients navigate their career journey.",
  },
  {
    title: "Health & Wellness",
    description:
      "Record wellness goals, habit changes, and health milestones. Support clients in sustainable lifestyle changes.",
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
            <Icon icon="mdi:heart-pulse" className="text-lg" />
            <span>For Coaches</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Transform lives with
            <br />
            AI-powered meeting notes
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Be fully present with your clients while Char captures every
            insight, tracks progress, and helps you deliver transformational
            coaching.
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
          Built for coaching excellence
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every feature designed to help you be fully present and deliver
          transformational results.
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
          For every coaching practice
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Whatever your coaching specialty, Char helps you capture and leverage
          every client session.
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
          Ready to amplify your impact?
        </h2>
        <p className="text-neutral-600 mb-8">
          Join coaches who are transforming lives with AI-powered meeting notes.
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
