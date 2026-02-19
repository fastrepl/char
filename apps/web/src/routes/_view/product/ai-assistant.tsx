import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { MockChatInput } from "@/components/mock-chat-input";
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
  },
  {
    title: "Execute workflows and tasks",
    description:
      "Describe what you want to do, and let your AI assistant handle the rest. Automate follow-up tasks across your tools without manual data entry.",
    integrations: [
      { icon: "simple-icons:slack", label: "" },
      { icon: "simple-icons:linear", label: "" },
      { icon: "simple-icons:jira", label: "" },
    ],
  },
  {
    title: "Chat during meetings",
    description:
      "Get instant answers from the current transcript and past meeting context.",
  },
  {
    title: "Improve with every transcription",
    description:
      "Your AI assistant learns from every interaction, adapting to your preferences and continuously improving transcription accuracy and summary quality.",
  },
  {
    title: "Deep Research based on your meetings",
    description:
      "Search through past conversations, extract key insights, and understand context before you join.",
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
        <GrowsWithYouSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b h-2/3 from-stone-50/30 to-stone-100/30 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto px-4">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6 flex items-center justify-center flex-wrap">
          <span>AI Chat</span>
          <img
            src="/api/images/hyprnote/ai-assistant.gif"
            alt="AI Chat"
            className="size-16 object-cover rounded-full inline-block ml-1 mr-3 sm:mr-0"
          />
          <span>for your meetings</span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 md:pb-16">
          Prepare, engage, and follow through with AI-powered assistance
        </p>
        <div className="pt-24 flex justify-center">
          <MockChatInput />
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
  const scrollProgress = useMotionValue(0);

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
      scrollProgress.set(progress);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });

  const scrollToFeature = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    const containerH = container.offsetHeight;
    const viewH = window.innerHeight - HEADER_HEIGHT;
    const maxScroll = containerH - viewH;
    const targetScroll =
      containerTop - HEADER_HEIGHT + (index / FEATURES.length) * maxScroll;

    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop */}
      <div
        ref={containerRef}
        className="hidden md:block relative border-t border-neutral-100"
        style={{ height: `${FEATURES.length * 100}vh` }}
      >
        <div ref={pinnedRef} className="grid grid-cols-2 bg-white">
          <div className="flex flex-col justify-center  border-r border-neutral-100">
            <div className="flex flex-col h-full">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  animate={{
                    opacity: index === activeIndex ? 1 : 0.35,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative cursor-pointer border-b border-neutral-100 overflow-hidden h-1/5"
                  onClick={() => scrollToFeature(index)}
                >
                  <FeatureProgressBar
                    index={index}
                    activeIndex={activeIndex}
                    scrollProgress={scrollProgress}
                    total={FEATURES.length}
                  />
                  <div className="relative z-10 py-6 px-4 lg:px-8">
                    <h3 className="text-xl font-serif text-stone-600 mb-1">
                      {feature.title}
                    </h3>
                    <p
                      className={cn([
                        "text-neutral-500 leading-relaxed text-sm transition-colors duration-400",
                        index === activeIndex && "text-neutral-600",
                      ])}
                    >
                      {feature.description}
                    </p>
                    {feature.integrations && (
                      <div className="flex items-center gap-3 mt-3">
                        {feature.integrations.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-1.5 text-xs text-neutral-400"
                          >
                            <Icon icon={item.icon} className="text-sm" />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-center p-12 lg:p-16"
            style={{ backgroundImage: "url(/patterns/dots.svg)" }}
          >
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
            <h3 className="text-lg font-serif text-stone-600 mb-3">
              {feature.title}
            </h3>
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

function FeatureProgressBar({
  index,
  activeIndex,
  scrollProgress,
  total,
}: {
  index: number;
  activeIndex: number;
  scrollProgress: ReturnType<typeof useMotionValue<number>>;
  total: number;
}) {
  const segmentStart = index / total;
  const segmentEnd = (index + 1) / total;

  const scaleX = useTransform(
    scrollProgress,
    [segmentStart, segmentEnd],
    [0, 1],
  );

  const isActive = index === activeIndex;
  const isPast = index < activeIndex;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {isPast ? (
        <div className="absolute inset-0" />
      ) : isActive ? (
        <motion.div
          className="absolute inset-0 origin-left"
          style={{ scaleX }}
        />
      ) : null}
    </div>
  );
}

type ChatStep = {
  node: React.ReactNode | ((activeIndex: number) => React.ReactNode);
  delay: number;
};

type ChatPanel = {
  type: "chat";
  steps: ChatStep[];
  footer?: React.ReactNode;
};

type SpecialPanel = {
  type: "special";
  content: React.ReactNode;
};

type Panel = ChatPanel | SpecialPanel;

function SearchToolCall({ activeIndex }: { activeIndex: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeIndex]);

  const meetings = [
    "Weekly Sync — Oct 12",
    "1:1 with Sarah — Oct 10",
    "Sprint Planning — Oct 8",
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className={cn([
            "size-2 rounded-full",
            phase < 2 ? "bg-blue-400 animate-pulse" : "bg-blue-400",
          ])}
        />
        <span className="text-xs text-neutral-500">
          {phase < 2 ? "Searching meetings..." : "3 meetings found"}
        </span>
      </div>
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-1 overflow-hidden"
          >
            {meetings.slice(0, phase >= 2 ? 3 : 1).map((m) => (
              <motion.div
                key={m}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-center gap-2 text-xs text-neutral-500"
              >
                <Icon
                  icon="mdi:calendar-outline"
                  className="text-sm text-neutral-400"
                />
                <span>{m}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JiraToolCall({ activeIndex }: { activeIndex: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeIndex]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-gradient-to-r from-blue-50 to-stone-50 p-3">
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
        <Icon icon="logos:jira" className="text-sm" />
        <AnimatePresence mode="wait">
          {phase < 1 ? (
            <motion.span
              key="creating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <span className="inline-block size-3 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
              Creating ticket...
            </motion.span>
          ) : (
            <motion.span
              key="created"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              <span>ENG-247</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">
                Created
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm font-medium text-stone-700">
              Mobile UI bug fix
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-2 flex items-center gap-2 text-xs text-neutral-500 overflow-hidden"
          >
            <div className="size-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
              S
            </div>
            <span>Sarah</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TranscriptToolCall({ activeIndex }: { activeIndex: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeIndex]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <div className="flex flex-col gap-2 text-sm">
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <span className="font-medium text-stone-700">Sarah: </span>
              <span className="text-neutral-600">
                The API changes will need at least two sprints...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <span className="font-medium text-stone-700">Ben: </span>
              <span className="text-neutral-600">
                I can start on the auth module this week.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {phase === 0 && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
            <span className="inline-block size-3 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin" />
            Reading transcript...
          </div>
        )}
      </div>
    </div>
  );
}

const CHAT_PANELS: Panel[] = [
  {
    type: "chat",
    steps: [
      {
        delay: 200,
        node: (
          <div className="flex w-full justify-end">
            <div className="rounded-t-2xl rounded-bl-2xl w-2/3 bg-blue-50 border border-neutral-200 px-4 py-3">
              <p className="text-sm text-stone-700">
                What did Sarah say about the timeline?
              </p>
            </div>
          </div>
        ),
      },
      {
        delay: 800,
        node: (idx: number) => <SearchToolCall activeIndex={idx} />,
      },
      {
        delay: 3000,
        node: (
          <div className="rounded-xl bg-gradient-to-b from-white to-stone-100 border border-stone-200 px-4 py-3 w-2/3">
            <p className="text-sm text-stone-500 mb-1">Char</p>
            <p className="text-sm text-stone-700">
              In your Oct 12 meeting, Sarah mentioned the deadline is Q1 2026
              with a soft launch in December.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    type: "chat",
    steps: [
      {
        delay: 200,
        node: (
          <div className="flex w-full justify-end">
            <div className="rounded-t-2xl rounded-bl-2xl w-2/3 bg-blue-50 border border-neutral-200 px-4 py-3">
              <p className="text-sm text-stone-700">
                Create a Jira ticket for the mobile bug and assign to Sarah
              </p>
            </div>
          </div>
        ),
      },
      {
        delay: 800,
        node: (idx: number) => <JiraToolCall activeIndex={idx} />,
      },
      {
        delay: 3200,
        node: (
          <div className="rounded-xl bg-gradient-to-b from-white to-stone-100 border border-stone-200 px-4 py-3 w-2/3">
            <p className="text-sm text-stone-500 mb-1">Char</p>
            <div className="flex items-center gap-2 text-sm">
              <Icon
                icon="mdi:check-circle"
                className="text-green-500 text-sm"
              />
              <span className="text-stone-700">
                Jira ticket ENG-247 created and assigned to Sarah.
              </span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    type: "chat",
    steps: [
      {
        delay: 200,
        node: (
          <div className="flex w-full justify-end">
            <div className="rounded-t-2xl rounded-bl-2xl w-2/3 bg-blue-50 border border-neutral-200 px-4 py-3">
              <p className="text-sm text-stone-700">
                What's the timeline for the mobile UI?
              </p>
            </div>
          </div>
        ),
      },
      {
        delay: 800,
        node: (idx: number) => <TranscriptToolCall activeIndex={idx} />,
      },
      {
        delay: 2800,
        node: (
          <div className="rounded-xl bg-gradient-to-b from-white to-stone-100 border border-stone-200 px-4 py-3 w-2/3">
            <p className="text-sm text-stone-500 mb-1">Char</p>
            <p className="text-sm text-stone-700">
              Ben committed to auth module this week. Sarah estimates 2 sprints
              for full API.
            </p>
          </div>
        ),
      },
    ],
    footer: (
      <div>
        <div className="h-[2px] bg-red-400 w-full" />
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs text-neutral-500">Design weekly sync</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="size-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
              <Icon icon="mdi:phone-hangup" className="text-sm" />
            </button>
            <button className="size-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors">
              <Icon icon="mdi:dots-horizontal" className="text-base" />
            </button>
          </div>
        </div>
      </div>
    ),
  },
  {
    type: "special",
    content: (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="mdi:trending-up" className="text-lg text-purple-500" />
          <span className="text-sm font-medium text-stone-600">
            Quality improving over time
          </span>
        </div>
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
        <div className="flex gap-4 pt-2">
          {[
            { label: "Accuracy", value: "94%" },
            { label: "Adapted", value: "12x" },
          ].map((stat) => (
            <div key={stat.label} className="text-sm">
              <span className="text-stone-700 font-medium">{stat.value}</span>
              <span className="text-neutral-400 ml-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    type: "special",
    content: (
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-600">
              JK
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">Jennifer Kim</p>
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
            Last 3 meetings focused on mobile launch timeline. Jennifer prefers
            concise bullet-point summaries.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Icon
            icon="mdi:file-search-outline"
            className="text-sm text-amber-500"
          />
          <span className="text-xs text-neutral-500">
            5 past meetings analyzed
          </span>
        </div>
      </div>
    ),
  },
];

function ChatMessages({
  panel,
  activeIndex,
}: {
  panel: ChatPanel;
  activeIndex: number;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const timers = panel.steps.map((step, i) =>
      setTimeout(() => setVisibleCount(i + 1), step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [activeIndex, panel.steps]);

  return (
    <motion.div
      className="flex flex-col justify-end gap-3 p-4 min-h-[280px]"
      exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
      transition={{ duration: 0.25, ease: "easeIn" }}
    >
      <AnimatePresence initial={false}>
        {panel.steps.slice(0, visibleCount).map((step, i) => (
          <motion.div
            key={`${activeIndex}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            layout
          >
            {typeof step.node === "function"
              ? step.node(activeIndex)
              : step.node}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function FeatureVisual({ activeIndex }: { activeIndex: number }) {
  const [inputValue, setInputValue] = useState("");
  const panel = CHAT_PANELS[activeIndex];
  const isChat = panel.type === "chat";
  const hasFooter = isChat && !!panel.footer;

  return (
    <div className="w-full max-w-[420px]">
      <motion.div
        layout
        transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}
      >
        <AnimatePresence mode="wait">
          {isChat ? (
            <ChatMessages
              key={`chat-${activeIndex}`}
              panel={panel}
              activeIndex={activeIndex}
            />
          ) : (
            <motion.div
              key={`special-${activeIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {panel.content}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isChat && (
            <motion.div
              key={`footer-${hasFooter ? "custom" : "input"}`}
              initial={{ opacity: 0, height: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
              exit={{ opacity: 0, height: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {hasFooter ? (
                panel.footer
              ) : (
                <div className="border border-neutral-100 rounded-2xl bg-gradient-to-b from-stone-50 to-stone-100 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask Char anything..."
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-neutral-400 text-stone-700"
                    />
                    <div
                      className={cn([
                        "flex items-center justify-center size-7 rounded-lg shrink-0 transition-colors",
                        inputValue
                          ? "bg-stone-600 text-white"
                          : "bg-neutral-100 text-neutral-300",
                      ])}
                    >
                      <Icon icon="mdi:arrow-up" className="text-base" />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ExtensionsSection() {
  return (
    <section>

      <div className="flex flex-col justify-center items-center border-t border-neutral-100">
        <div className="p-8 pt-16">
          <h2 className="md:text-4xl text-2xl text-stone-600 tracking-wide font-serif text-center pb-8">
            Realtime insights via{" "}
            <Link
              to="/product/extensions/"
              className="text-stone-600 hover:text-stone-800 underline decoration-dotted underline-offset-2"
            >
              extensions
            </Link>
          </h2>
          <p className="text-neutral-600 mb-4 leading-relaxed max-w-3xl text-center">
            AI-powered extensions provide live assistance during your meeting.
            Built on our extension framework, these tools adapt to your needs in
            realtime.
          </p>
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

        <div className="">
          <div className="py-8 px-6 lg:px-8">
            <p className="text-md  text-stone-400 mb-6 text-center">
              Available realtime extensions
            </p>
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
    <section className="pt-16 pb-16 px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-12">
      <h2 className="md:text-4xl text-2xl text-stone-600 tracking-wide font-serif text-center pb-8">
          Generate custom templates
        </h2>
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
              "rounded-t-2xl rounded-bl-2xl border border-neutral-200 bg-gradient-to-b from-stone-50 to-stone-100",
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

function GrowsWithYouSection() {
  return (
    <section>
      <div className="flex flex-col items-center gap-4 pt-16 pb-8 text-center px-4">
        <h2 className="md:text-4xl text-2xl text-stone-600 tracking-wide font-serif pb-4">
          Char grows with you
        </h2>
        <p className="text-md text-neutral-500 mx-auto max-w-xl pb-4">
          Add people from meetings in contacts, grow knowledge about your chats
          and context of previous meetings
        </p>
        <Link
          to="/product/mini-apps/"
          className="text-md underline text-neutral-600 hover:text-neutral-800 flex items-center gap-1"
        >
          Explore all features
          <Icon icon="mdi:arrow-top-right" className="text-sm" />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 border-t border-neutral-200">
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-neutral-200">
          <div className="p-8">
            <h3 className="text-2xl font-serif text-stone-600 mb-3">
              Your contacts in one place
            </h3>
            <p className="text-md text-neutral-600 leading-relaxed mb-4">
              Import contacts and watch them come alive with context once you
              actually meet.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-md text-neutral-600">
                  All your chats linked
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-md text-neutral-600">
                  Generated summary from meetings
                </span>
              </li>
            </ul>
          </div>
          <div className="overflow-hidden mt-auto bg-gradient-to-b from-white to-stone-100">
            <img
              src="/contact_human.webp"
              alt="Contacts interface"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="p-8">
            <h3 className="text-2xl font-serif text-stone-600 mb-3">
              Calendar
            </h3>
            <p className="text-md text-neutral-600 leading-relaxed mb-4">
              Connect your calendar for intelligent meeting preparation and
              automatic note organization.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-md text-neutral-600">
                  Automatic meeting linking
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-md text-neutral-600">
                  Pre-meeting context and preparation
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-md text-neutral-600">
                  Timeline view with notes
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center px-8 py-8 overflow-hidden mt-auto bg-gradient-to-b from-white to-stone-100">
            <div className="max-w-lg w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <Icon
                  icon="mdi:calendar"
                  className="text-2xl text-stone-700 shrink-0 mt-1"
                />
                <div className="flex-1">
                  <h4 className="text-lg font-serif text-stone-600 mb-1">
                    Weekly Team Sync
                  </h4>
                  <p className="text-sm text-neutral-600">
                    Today at 10:00 AM · 30 minutes
                  </p>
                </div>
                <button className="px-3 py-1 text-xs bg-stone-600 text-white rounded-full">
                  Start Recording
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <h5 className="text-sm font-medium text-stone-600 mb-2">
                    Last meeting context
                  </h5>
                  <div className="p-3 bg-stone-50 border border-stone-300 rounded text-xs">
                    <div className="font-medium text-stone-900 mb-1">
                      Jan 8, 2025 - Weekly Team Sync
                    </div>
                    <p className="text-stone-800">
                      Discussed Q1 roadmap, decided to prioritize mobile app.
                      Sarah to review designs by Jan 15.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
