import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";

import { SlashSeparator } from "@/components/slash-separator";
import { CTASection } from "@/routes/_view/index";

export const Route = createFileRoute("/_view/why-hyprnote")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Why Hyprnote - AI Meeting Notes You Actually Own" },
      {
        name: "description",
        content:
          "Your meeting notes should be files on your computer, not rows in someone else's database. Plain Markdown files, AI providers you can switch, no bots, no lock-in.",
      },
      { property: "og:title", content: "Why Hyprnote" },
      {
        property: "og:description",
        content:
          "Most AI note-takers lock your data in their database. We thought that was bullshit. So we built Hyprnote differently.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/why-hyprnote" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Why Hyprnote" },
      {
        name: "twitter:description",
        content:
          "Your meeting notes should be files on your computer, not rows in someone else's database.",
      },
    ],
  }),
});

function Component() {
  const heroInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <WhyWereDifferentSection />
        <SlashSeparator />
        <WhoThisIsForSection />
        <SlashSeparator />
        <WhatWereBuildingTowardSection />
        <SlashSeparator />
        <HereForTheLongHaulSection />
        <SlashSeparator />
        <CTASection heroInputRef={heroInputRef} />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-16 lg:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-600 mb-8">
            Why Hyprnote exists
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed mb-6">
            Most AI note-takers lock your data in their database, force you to
            use their AI stack, and make you lose everything if you leave.
          </p>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed font-medium">
            We thought that was bullshit.
          </p>
        </div>
      </div>
    </div>
  );
}

const differentiators = [
  {
    title: "Plain Markdown files",
    description: "Not proprietary databases—files you own that work in any app",
    icon: "mdi:file-document-outline",
  },
  {
    title: "No meeting bots",
    description:
      "System audio capture works everywhere: Zoom, Teams, phone calls, in-person",
    icon: "mdi:microphone-off",
  },
  {
    title: "Choose your AI",
    description:
      "Managed service, bring your own key, or run fully local models",
    icon: "mdi:brain",
  },
  {
    title: "Open source",
    description: "Public code that security teams can audit and verify",
    icon: "mdi:github",
  },
  {
    title: "Zero lock-in",
    description:
      "Export anytime, switch providers anytime, or just stop using us",
    icon: "mdi:lock-open-outline",
  },
];

function WhyWereDifferentSection() {
  return (
    <section className="px-6 py-16 lg:py-24 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-12 text-center">
          So we built Hyprnote to give you back control.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.slice(0, 3).map((item) => (
            <div
              key={item.title}
              className="p-6 bg-white rounded-lg border border-neutral-100 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-stone-100 rounded-lg shrink-0">
                  <Icon icon={item.icon} className="text-2xl text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-700 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 max-w-2xl mx-auto lg:max-w-none lg:flex lg:justify-center lg:gap-6">
          {differentiators.slice(3).map((item) => (
            <div
              key={item.title}
              className="p-6 bg-white rounded-lg border border-neutral-100 shadow-sm lg:w-[calc(33.333%-1rem)]"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-stone-100 rounded-lg shrink-0">
                  <Icon icon={item.icon} className="text-2xl text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-700 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const audiences = [
  {
    title: "Your company banned Otter/ChatGPT/Granola",
    description:
      "Your IT team can audit the open-source code. Files stay on your device. You can use whichever AI provider your company already approved or run everything locally.",
    icon: "mdi:shield-check-outline",
  },
  {
    title: "You're deep into Obsidian/Logseq/PKM systems",
    description:
      "You've spent years building a knowledge vault in Markdown. Your meeting notes shouldn't live in a separate app that doesn't integrate with anything.",
    icon: "mdi:note-multiple-outline",
  },
  {
    title: "You already pay for OpenAI/Anthropic API credits",
    description:
      "Why pay markup on top of API costs you already have? Bring your own key and use the credits you're already buying.",
    icon: "mdi:key-outline",
  },
  {
    title: "You're an open-source advocate who self-hosts everything",
    description:
      "You run Nextcloud, care about FOSS, and need to verify no data leaves your infrastructure. Hyprnote lets you audit the code and run everything locally.",
    icon: "mdi:server-outline",
  },
  {
    title: "You just want a simple notepad that works",
    description:
      "You don't care about the philosophy. You want to take notes during calls without thinking about it. Hyprnote does that.",
    icon: "mdi:notebook-outline",
  },
];

function WhoThisIsForSection() {
  return (
    <section className="px-6 py-16 lg:py-24">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4 text-center">
          Hyprnote's for you, if
        </h2>

        <div className="flex flex-col gap-8">
          {audiences.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-6 bg-stone-50/50 rounded-lg border border-neutral-100"
            >
              <div className="p-2 bg-white rounded-lg shrink-0 h-fit border border-neutral-100">
                <Icon icon={item.icon} className="text-2xl text-stone-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-700 mb-2">
                  {item.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatWereBuildingTowardSection() {
  return (
    <section className="px-6 py-16 lg:py-24 bg-stone-50/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-8">
          What we're building toward
        </h2>

        <div className="flex flex-col gap-6 text-lg text-neutral-600 leading-relaxed">
          <p>
            We're not betting on GPT-5 or Claude Opus 7 or whatever comes next.
          </p>

          <p>We're betting on files.</p>

          <p>
            Files outlive apps. Files work with every tool. Files don't
            disappear when a startup shuts down.
          </p>

          <p>
            AI providers will come and go. SaaS platforms will rise and fall.
            But Markdown files from 2006 still open perfectly in 2026.
          </p>

          <p>That's the foundation. Everything else is just software on top.</p>
        </div>
      </div>
    </section>
  );
}

const commitments = [
  "No auto-renewal traps",
  "No annual price increases",
  "No forcing you onto annual contracts",
  'No hiding features behind "contact sales"',
  "No meeting bots that make your coworkers uncomfortable",
];

function HereForTheLongHaulSection() {
  return (
    <section className="px-6 py-16 lg:py-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-8 text-center">
          Here for the long haul
        </h2>

        <div className="flex flex-col gap-6 text-neutral-700 leading-relaxed">
          <p>
            This isn't a bait-and-switch. We're not looking to get acquired and
            cash out.
          </p>

          <p>
            <span className="font-semibold text-stone-700">
              We're building the company we want to work for
            </span>
            —one that treats users the way we'd want to be treated.
          </p>

          <p>That means:</p>

          <ul className="flex flex-col gap-3">
            {commitments.map((commitment) => (
              <li key={commitment} className="flex items-center gap-3">
                <div className="p-1 bg-stone-100 rounded-full shrink-0">
                  <Icon icon="mdi:check" className="text-lg text-stone-600" />
                </div>
                <span>{commitment}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4">
            If that sounds like the kind of company you want to support,{" "}
            <Link
              to="/"
              hash="hero"
              className="font-semibold text-stone-700 hover:underline decoration-dotted"
            >
              download Hyprnote and try it
            </Link>
            .
          </p>

          <p className="text-lg font-medium text-stone-700">
            If we screw this up, you can export everything and walk away. That's
            the deal.
          </p>
        </div>
      </div>
    </section>
  );
}
