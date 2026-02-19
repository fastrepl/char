import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/ai-assistant")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Chat - Char" },
      {
        name: "description",
        content:
          "AI assistant that helps you before, during, and after meetings. Prepare with research, get realtime insights, and execute workflows—all powered by local AI.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const FEATURES = [
  {
    title: "Ask about past conversations",
    description:
      "Query your entire conversation history to refresh your memory. Find decisions, action items, or specific topics discussed in previous meetings\u2014all in natural language.",
    icon: "mdi:message-question",
  },
  {
    title: "Execute workflows and tasks",
    description:
      "Describe what you want to do, and let your AI assistant handle the rest. Automate follow-up tasks across your tools without manual data entry.",
    icon: "mdi:workflow",
  },
  {
    title: "Chat during meetings",
    description:
      "Get instant answers from the current transcript and past meeting context.",
    icon: "mdi:chat",
  },
  {
    title: "Improve with every transcription",
    description:
      "Your AI assistant learns from every interaction, adapting to your preferences and continuously improving transcription accuracy and summary quality.",
    icon: "mdi:brain",
  },
  {
    title: "Deep Research based on your meetings",
    description:
      "Search through past conversations, extract key insights, and understand context before you join.",
    icon: "mdi:magnify",
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
        <SlashSeparator />
        <ScrollFeatureSection />
        <SlashSeparator />
        <ExtensionsSection />
        <SlashSeparator />
        <TemplatesSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6 flex items-center justify-center flex-wrap">
          <span>AI Chat</span>
          <img
            src="/api/images/hyprnote/ai-assistant.gif"
            alt="AI Chat"
            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full inline-block ml-1 mr-2 sm:mr-0"
          />
          <span>for your meetings</span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Prepare, engage, and follow through with AI-powered assistance
        </p>
        <div className="mt-8">
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
        </div>
      </header>
    </div>
  );
}

const HEADER_HEIGHT = 69;

function ScrollFeatureSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const container = containerRef.current;
      const pinned = pinnedRef.current;
      if (!container || !pinned) return;

      const rect = container.getBoundingClientRect();
      const viewH = window.innerHeight - HEADER_HEIGHT;
      const containerH = container.offsetHeight;

      const scrolledPast = HEADER_HEIGHT - rect.top;
      const maxScroll = containerH - viewH;

      if (scrolledPast <= 0) {
        pinned.style.position = "absolute";
        pinned.style.top = "0px";
        pinned.style.bottom = "auto";
        pinned.style.left = "0";
        pinned.style.right = "0";
        pinned.style.width = "";
        pinned.style.height = `${viewH}px`;
      } else if (scrolledPast >= maxScroll) {
        pinned.style.position = "absolute";
        pinned.style.top = "auto";
        pinned.style.bottom = "0px";
        pinned.style.left = "0";
        pinned.style.right = "0";
        pinned.style.width = "";
        pinned.style.height = `${viewH}px`;
      } else {
        pinned.style.position = "fixed";
        pinned.style.top = `${HEADER_HEIGHT}px`;
        pinned.style.bottom = "auto";
        pinned.style.left = `${rect.left}px`;
        pinned.style.right = "auto";
        pinned.style.width = `${container.offsetWidth}px`;
        pinned.style.height = `${viewH}px`;
      }

      const progress = Math.max(0, Math.min(1, scrolledPast / maxScroll));
      const index = Math.min(
        Math.floor(progress * FEATURES.length),
        FEATURES.length - 1,
      );
      setActiveIndex(index);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });

  return (
    <>
      {/* Desktop */}
      <div
        ref={containerRef}
        className="hidden md:block relative border-t border-neutral-100"
        style={{ height: `${FEATURES.length * 100}vh` }}
      >
        <div ref={pinnedRef} className="grid grid-cols-2 bg-white">
          <div className="flex flex-col justify-center px-12 lg:px-16 border-r border-neutral-100">
            <div className="flex flex-col gap-2">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  animate={{
                    opacity: index === activeIndex ? 1 : 0.25,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="py-4 cursor-default"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon
                      icon={feature.icon}
                      className={cn([
                        "text-2xl transition-colors duration-400",
                        index === activeIndex
                          ? "text-stone-600"
                          : "text-stone-400",
                      ])}
                    />
                    <h3 className="text-xl font-serif text-stone-600">
                      {feature.title}
                    </h3>
                  </div>
                  <AnimatePresence>
                    {index === activeIndex && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="text-neutral-600 leading-relaxed pl-9 overflow-hidden"
                      >
                        {feature.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center p-12 lg:p-16">
            <FeatureVisual activeIndex={activeIndex} />
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className={cn([
              "border-b border-neutral-100 px-6 py-10",
              index === 0 && "border-t",
            ])}
          >
            <div className="flex items-center gap-3 mb-3">
              <Icon icon={feature.icon} className="text-2xl text-stone-600" />
              <h3 className="text-lg font-serif text-stone-600">
                {feature.title}
              </h3>
            </div>
            <p className="text-neutral-600 leading-relaxed mb-6">
              {feature.description}
            </p>
            <div className="flex justify-center">
              <FeatureVisual activeIndex={index} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FeatureVisual({ activeIndex }: { activeIndex: number }) {
  const panelConfigs = [
    {
      a: {
        icon: "mdi:magnify",
        label: "Search",
        color: "bg-blue-50 text-blue-600 border-blue-200",
      },
      b: (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p className="text-sm text-neutral-500 mb-1">You</p>
            <p className="text-sm text-stone-700">
              What did Sarah say about the timeline?
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <p className="text-sm text-stone-500 mb-1">Char</p>
            <p className="text-sm text-stone-700">
              In your Oct 12 meeting, Sarah mentioned the deadline is Q1 2026
              with a soft launch in December.
            </p>
          </div>
        </div>
      ),
      c: (
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-blue-400" />
          <span className="text-xs text-neutral-500">
            3 meetings referenced
          </span>
        </div>
      ),
      d: (
        <div className="flex flex-col gap-1.5">
          {[
            "Weekly Sync — Oct 12",
            "1:1 with Sarah — Oct 10",
            "Sprint Planning — Oct 8",
          ].map((m) => (
            <div
              key={m}
              className="flex items-center gap-2 text-xs text-neutral-500"
            >
              <Icon
                icon="mdi:calendar-outline"
                className="text-sm text-neutral-400"
              />
              <span>{m}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      a: {
        icon: "mdi:workflow",
        label: "Workflow",
        color: "bg-green-50 text-green-600 border-green-200",
      },
      b: (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p className="text-sm text-stone-700">
              Create a Jira ticket for the mobile bug and assign to Sarah
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
              <Icon icon="logos:jira" className="text-sm" />
              <span>ENG-247</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">
                Created
              </span>
            </div>
            <p className="text-sm font-medium text-stone-700">
              Mobile UI bug fix
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <div className="size-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                S
              </div>
              <span>Sarah</span>
            </div>
          </div>
        </div>
      ),
      c: (
        <div className="flex items-center gap-3">
          {[
            { icon: "simple-icons:jira", label: "Jira" },
            { icon: "simple-icons:slack", label: "Slack" },
            { icon: "simple-icons:googlecalendar", label: "Calendar" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 text-xs text-neutral-500"
            >
              <Icon icon={item.icon} className="text-sm" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ),
      d: (
        <div className="flex items-center gap-2 text-xs">
          <Icon icon="mdi:check-circle" className="text-green-500 text-sm" />
          <span className="text-green-700">Task created successfully</span>
        </div>
      ),
    },
    {
      a: {
        icon: "mdi:record-circle",
        label: "Live",
        color: "bg-red-50 text-red-500 border-red-200",
      },
      b: (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="font-medium text-stone-700">Sarah: </span>
                <span className="text-neutral-600">
                  The API changes will need at least two sprints...
                </span>
              </div>
              <div>
                <span className="font-medium text-stone-700">Ben: </span>
                <span className="text-neutral-600">
                  I can start on the auth module this week.
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <p className="text-sm text-stone-500 mb-1">Char</p>
            <p className="text-sm text-stone-700">
              Ben committed to auth module this week. Sarah estimates 2 sprints
              for full API.
            </p>
          </div>
        </div>
      ),
      c: (
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs text-red-600">Recording in progress</span>
        </div>
      ),
      d: (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Icon icon="mdi:clock-outline" className="text-sm" />
          <span>23 min elapsed</span>
        </div>
      ),
    },
    {
      a: {
        icon: "mdi:brain",
        label: "Learning",
        color: "bg-purple-50 text-purple-600 border-purple-200",
      },
      b: (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p className="text-xs text-neutral-400 mb-1">Before</p>
            <p className="text-sm text-neutral-500 line-through decoration-neutral-300">
              the team talked about doing stuff with the dashboard and some api
              things
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <p className="text-xs text-stone-400 mb-1">After</p>
            <p className="text-sm text-stone-700">
              The team agreed to prioritize the dashboard redesign and begin API
              migration in Sprint 14.
            </p>
          </div>
        </div>
      ),
      c: (
        <div className="flex items-center gap-2">
          <Icon icon="mdi:trending-up" className="text-sm text-purple-500" />
          <span className="text-xs text-neutral-500">
            Quality improving over time
          </span>
        </div>
      ),
      d: (
        <div className="flex gap-3">
          {[
            { label: "Accuracy", value: "94%" },
            { label: "Adapted", value: "12x" },
          ].map((stat) => (
            <div key={stat.label} className="text-xs">
              <span className="text-stone-700 font-medium">{stat.value}</span>
              <span className="text-neutral-400 ml-1">{stat.label}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      a: {
        icon: "mdi:magnify",
        label: "Research",
        color: "bg-amber-50 text-amber-600 border-amber-200",
      },
      b: (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-600">
                JK
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">John Kim</p>
                <p className="text-xs text-neutral-500">Product Manager</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {["Q4 roadmap", "Mobile launch", "Budget review"].map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <p className="text-sm text-stone-700">
              Last 3 meetings focused on mobile launch timeline. John prefers
              concise bullet-point summaries.
            </p>
          </div>
        </div>
      ),
      c: (
        <div className="flex items-center gap-2">
          <Icon
            icon="mdi:file-search-outline"
            className="text-sm text-amber-500"
          />
          <span className="text-xs text-neutral-500">
            5 past meetings analyzed
          </span>
        </div>
      ),
      d: (
        <div className="flex flex-col gap-1.5">
          {[
            "Key decision: Mobile-first approach",
            "Open item: Budget approval pending",
          ].map((insight) => (
            <div
              key={insight}
              className="flex items-start gap-2 text-xs text-neutral-600"
            >
              <Icon
                icon="mdi:lightbulb-outline"
                className="text-sm text-amber-500 shrink-0 mt-0.5"
              />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const config = panelConfigs[activeIndex];

  return (
    <div className="w-full max-w-[420px]">
      <div className="grid grid-cols-[140px_1fr] grid-rows-[auto_auto] gap-3">
        <div className="col-span-1 row-span-1 flex flex-col gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`a-${activeIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn([
                "rounded-xl border px-3 py-2.5 flex items-center gap-2",
                config.a.color,
              ])}
            >
              <Icon icon={config.a.icon} className="text-base" />
              <span className="text-xs font-medium">{config.a.label}</span>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`c-${activeIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
            >
              {config.c}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`d-${activeIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
            >
              {config.d}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="col-span-1 row-span-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`b-${activeIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
              className="rounded-2xl border border-neutral-200 bg-white p-4 h-full"
            >
              {config.b}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ExtensionsSection() {
  return (
    <section>
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Realtime insights
      </div>

      <div className="border-t border-neutral-100">
        <div className="p-8">
          <Icon
            icon="mdi:lightbulb-on"
            className="text-3xl text-stone-600 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-600 mb-3">
            Realtime insights via{" "}
            <Link
              to="/product/extensions/"
              className="text-stone-600 hover:text-stone-800 underline decoration-dotted underline-offset-2"
            >
              extensions
            </Link>
          </h3>
          <p className="text-neutral-600 mb-4 leading-relaxed max-w-3xl">
            AI-powered extensions provide live assistance during your meeting.
            Built on our extension framework, these tools adapt to your needs in
            realtime.
          </p>
        </div>

        <div className="border-t border-neutral-100">
          <div className="py-8 px-6 lg:px-8">
            <h4 className="text-lg font-serif text-stone-600 mb-6 text-center">
              Available realtime extensions
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:comment-check"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">Suggestions</h5>
                <p className="text-sm text-neutral-600">
                  Get AI-generated advice and recommendations based on the
                  conversation flow
                </p>
              </div>

              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:account-voice"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  Talk time tracking
                </h5>
                <p className="text-sm text-neutral-600">
                  Monitor who's speaking and for how long to ensure balanced
                  participation
                </p>
              </div>

              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:school"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  ELI5 explanations
                </h5>
                <p className="text-sm text-neutral-600">
                  Get instant simple explanations of technical or professional
                  jargon
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/product/extensions/"
                className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
              >
                Learn more about extensions
                <Icon icon="mdi:arrow-right" className="text-lg" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TEMPLATE_PROMPTS = [
  "Create a customer discovery template",
  "Generate questions for a technical interview",
  "Build an agenda for our quarterly review",
];

function TemplatesSection() {
  return (
    <section className="py-16 px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h3 className="text-2xl font-serif text-stone-700 mb-4">
          Generate custom templates
        </h3>
        <p className="text-neutral-600 leading-relaxed">
          Create tailored meeting templates on the spot. Ask your AI assistant
          to generate agendas, question lists, or note structures specific to
          your meeting type.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {TEMPLATE_PROMPTS.map((prompt) => (
          <div
            key={prompt}
            className={cn([
              "rounded-2xl border border-neutral-200 bg-neutral-50/50",
              "px-5 py-4 text-sm text-stone-600",
            ])}
          >
            {prompt}
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 lg:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <img
            src="/api/images/hyprnote/icon.png"
            alt="Char"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Start using your AI assistant
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Get AI-powered help before, during, and after every meeting with Char
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/download/"
            className={cn([
              "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Download for free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </Link>
          <Link
            to="/product/ai-notetaking/"
            className={cn([
              "px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "border border-neutral-300 text-stone-600 rounded-full",
              "hover:bg-white transition-colors",
            ])}
          >
            Learn about AI Notetaking
          </Link>
        </div>
      </div>
    </section>
  );
}
