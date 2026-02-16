import { Icon } from "@iconify-icon/react";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allArticles } from "content-collections";
import { CheckIcon } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { GitHubOpenSource } from "@/components/github-open-source";
import { GithubStars } from "@/components/github-stars";
import { Image } from "@/components/image";
import { LogoCloud } from "@/components/logo-cloud";
import { FAQ, FAQItem } from "@/components/mdx-jobs";
import { MockChatInput } from "@/components/mock-chat-input";
import { MockWindow } from "@/components/mock-window";
import { SlashSeparator } from "@/components/slash-separator";
import { SocialCard } from "@/components/social-card";
import { VideoModal } from "@/components/video-modal";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { addContact } from "@/functions/loops";
import { useHeroContext } from "@/hooks/use-hero-context";
import { getHeroCTA, getPlatformCTA, usePlatform } from "@/hooks/use-platform";
import { useAnalytics } from "@/hooks/use-posthog";

const MUX_PLAYBACK_ID = "bpcBHf4Qv5FbhwWD02zyFDb24EBuEuTPHKFUrZEktULQ";

const heroContent = {
  title: "AI Notepad for Meetings\u2014No Strings Attached.",
  subtitle: "No forced cloud. No data held hostage. No bots in your meetings.",
  valueProps: [
    {
      title: "Zero lock-in",
      description:
        "Choose your preferred STT and LLM provider. Cloud or local.",
    },
    {
      title: "You own your data",
      description: "Plain markdown files on your device. Works with any tool.",
    },
    {
      title: "Just works",
      description:
        "A simple, familiar notepad, real-time transcription, and AI summaries.",
    },
  ],
};

const mainFeatures = [
  {
    icon: "mdi:text-box-outline",
    title: "Real-time transcription",
    description:
      "While you take notes, Char listens and generates a live transcript",
    image: "/api/images/hyprnote/transcript.jpg",
    muxPlaybackId: "rbkYuZpGJGLHx023foq9DCSt3pY1RegJU5PvMCkRE3rE",
    link: "/product/ai-notetaking/#transcription",
  },
  {
    icon: "mdi:file-document-outline",
    title: "AI summary",
    description:
      "Char combines your notes and the transcript to create a perfect summary",
    image: "/api/images/hyprnote/summary.jpg",
    muxPlaybackId: "lKr5l1fWGNnRqOehiz15mV79VHtFOCiuO9urmgqs6V8",
    link: "/product/ai-notetaking/#summaries",
  },
  {
    icon: "mdi:chat-outline",
    title: "AI Chat",
    description:
      "Use natural language to get answers pulled directly from your transcript",
    image: "/api/images/hyprnote/chat.jpg",
    link: "/product/ai-assistant",
  },
  {
    icon: "mdi:window-restore",
    title: "Floating panel",
    description: "Overlay to quick access recording controls during calls",
    image: "/api/images/hyprnote/floating.jpg",
    link: "/product/ai-notetaking/#floating-panel",
  },
  {
    icon: "mdi:keyboard-outline",
    title: "Keyboard shortcuts",
    description: "Navigate and format quickly without touching your mouse",
    image: "/api/images/hyprnote/editor.jpg",
    muxPlaybackId: "sMWkuSxKWfH3RYnX51Xa2acih01ZP5yfQy01Q00XRd1yTQ",
    link: "/docs/faq/keyboard-shortcuts",
  },
];

const activeFeatureIndices = mainFeatures.map((_, i) => i);
const FEATURES_AUTO_ADVANCE_DURATION = 8000;

export const Route = createFileRoute("/_view/")({
  component: Component,
});

function Component() {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState(0);
  const featuresScrollRef = useRef<HTMLDivElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const scrollToFeature = (index: number) => {
    setSelectedFeature(index);
    if (featuresScrollRef.current) {
      const container = featuresScrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <YCombinatorBanner />
        {/* <HeroSection
          onVideoExpand={setExpandedVideo}
          heroInputRef={heroInputRef}
        /> */}
        {/* <SlashSeparator /> */}
        <HeroParagraphSection onVideoExpand={setExpandedVideo} />
        <SlashSeparator />
        <HowItWorksSection />
        <SlashSeparator />
        <AISection />
        <SlashSeparator />
        <GrowsWithYouSection />
        <SlashSeparator />
        <TestimonialsSection />
        <SlashSeparator />
        <TemplatesSection />
        <SlashSeparator />
        <GitHubOpenSource />
        <SlashSeparator />
        <FAQSection />
        <SlashSeparator />
        <BlogSection />
        <SlashSeparator />
        <CTASection heroInputRef={heroInputRef} />
      </div>
      <VideoModal
        playbackId={expandedVideo || ""}
        isOpen={expandedVideo !== null}
        onClose={() => setExpandedVideo(null)}
      />
    </main>
  );
}

function YCombinatorBanner() {
  return (
    <Link
      to="/blog/$slug/"
      params={{ slug: "hyprnote-is-now-char" }}
      className="group"
    >
      <div
        className={cn([
          "flex items-center justify-center gap-2 text-center",
          "bg-stone-50/70 border-b border-stone-100",
          "py-3 px-4",
          "font-serif text-sm text-stone-700",
          "hover:bg-stone-50 transition-all",
        ])}
      >
        <span className="group-hover:font-medium">Hyprnote is now Char.</span>
      </div>
    </Link>
  );
}

function HeroSection({
  onVideoExpand,
  heroInputRef,
}: {
  onVideoExpand: (id: string) => void;
  heroInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const platform = usePlatform();
  const heroCTA = getHeroCTA(platform);
  const heroContext = useHeroContext();
  const { track } = useAnalytics();
  const [shake, setShake] = useState(false);

  useEffect(() => {
    track("hero_section_viewed", {
      timestamp: new Date().toISOString(),
    });
  }, [track]);

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const intent = platform === "mobile" ? "Reminder" : "Waitlist";
      const eventName =
        platform === "mobile" ? "reminder_requested" : "os_waitlist_joined";

      track(eventName, {
        platform: platform,
        timestamp: new Date().toISOString(),
        email: email,
      });

      await addContact({
        data: {
          email,
          userGroup: "Lead",
          platform:
            platform === "mobile"
              ? "Mobile"
              : platform.charAt(0).toUpperCase() + platform.slice(1),
          source: "LANDING_PAGE",
          intent: intent,
        },
      });
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.email);
      form.reset();
    },
  });

  const handleTrigger = useCallback(() => {
    const inputEl = heroInputRef.current;
    if (inputEl) {
      inputEl.focus();
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, []);

  useEffect(() => {
    if (heroContext) {
      heroContext.setOnTrigger(handleTrigger);
    }
  }, [heroContext, handleTrigger]);

  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center">
        <section
          id="hero"
          className="flex flex-col items-center text-center gap-12 py-24 px-4 laptop:px-0"
        >
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
              {heroContent.title}
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              {heroContent.subtitle}
            </p>
          </div>

          {heroCTA.showInput ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="w-full max-w-md"
            >
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) {
                      return "Email is required";
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                      return "Please enter a valid email";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <>
                    <div
                      className={cn([
                        "relative flex items-center border-2 rounded-full overflow-hidden transition-all duration-200",
                        shake && "animate-shake border-stone-600",
                        !shake && mutation.isError && "border-red-500",
                        !shake && mutation.isSuccess && "border-green-500",
                        !shake &&
                          !mutation.isError &&
                          !mutation.isSuccess &&
                          "border-neutral-200 focus-within:border-stone-500",
                      ])}
                    >
                      <input
                        ref={heroInputRef}
                        type="email"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={heroCTA.inputPlaceholder}
                        className="flex-1 px-6 py-4 text-base outline-hidden bg-white"
                        disabled={mutation.isPending || mutation.isSuccess}
                      />
                      <button
                        type="submit"
                        disabled={mutation.isPending || mutation.isSuccess}
                        className="absolute right-1 px-6 py-3 text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
                      >
                        {mutation.isPending
                          ? "Sending..."
                          : mutation.isSuccess
                            ? "Sent!"
                            : heroCTA.buttonLabel}
                      </button>
                    </div>
                    {mutation.isSuccess && (
                      <p className="text-green-600 mt-4 text-sm">
                        Thanks! We'll be in touch soon.
                      </p>
                    )}
                    {mutation.isError && (
                      <p className="text-red-600 mt-4 text-sm">
                        {mutation.error instanceof Error
                          ? mutation.error.message
                          : "Something went wrong. Please try again."}
                      </p>
                    )}
                    {!mutation.isSuccess &&
                      !mutation.isError &&
                      (heroCTA.subtextLink ? (
                        <Link
                          to={heroCTA.subtextLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-500 hover:text-neutral-700 hover:underline decoration-dotted mt-4 text-sm block transition-colors"
                        >
                          {heroCTA.subtext}
                        </Link>
                      ) : (
                        <p className="text-neutral-500 mt-4 text-sm">
                          {heroCTA.subtext}
                        </p>
                      ))}
                  </>
                )}
              </form.Field>
            </form>
          ) : (
            <div className="flex flex-col gap-4 items-center">
              <DownloadButton />
              {heroCTA.subtextLink ? (
                <Link
                  to={heroCTA.subtextLink}
                  className="text-neutral-500 hover:text-neutral-700 text-sm transition-colors"
                >
                  {heroCTA.subtext}
                </Link>
              ) : (
                <p className="text-neutral-500 text-sm">{heroCTA.subtext}</p>
              )}
            </div>
          )}
        </section>

        <div className="relative aspect-video w-full max-w-4xl border-t border-neutral-100 md:hidden overflow-hidden">
          <VideoThumbnail
            playbackId={MUX_PLAYBACK_ID}
            onPlay={() => onVideoExpand(MUX_PLAYBACK_ID)}
          />
        </div>

        <div className="w-full">
          <ValuePropsGrid valueProps={heroContent.valueProps} />
          <div className="relative aspect-video w-full border-t border-neutral-100 hidden md:block overflow-hidden">
            <VideoThumbnail
              playbackId={MUX_PLAYBACK_ID}
              onPlay={() => onVideoExpand(MUX_PLAYBACK_ID)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type ScrollEffect = "opacity" | "blur" | "blurUp";

interface ScrollRevealWordProps {
  progress: ReturnType<typeof useMotionValue<number>>;
  range: [number, number];
  effect: ScrollEffect;
  children: React.ReactNode;
}

function ScrollRevealWord({
  progress,
  range,
  effect,
  children,
}: ScrollRevealWordProps) {
  const [rangeStart, rangeEnd] = range;
  const adjustedStart = Math.max(0, rangeStart - 0.05);

  const opacity = useTransform(progress, [adjustedStart, rangeEnd], [0.15, 1]);
  const filter = useTransform(
    progress,
    [adjustedStart, rangeEnd],
    ["blur(4px)", "blur(0px)"],
  );
  const y = useTransform(progress, [adjustedStart, rangeEnd], [5, 0]);

  const style = useMemo(() => {
    if (effect === "opacity") {
      return { opacity };
    }
    if (effect === "blur") {
      return { opacity, filter };
    }
    if (effect === "blurUp") {
      return { opacity, filter, y, display: "inline-block" as const };
    }
    return {};
  }, [effect, opacity, filter, y]);

  if (effect === "opacity" || effect === "blur" || effect === "blurUp") {
    return <motion.span style={style}>{children}</motion.span>;
  }

  return <span>{children}</span>;
}

interface ScrollRevealParagraphProps {
  children: React.ReactNode;
  effect?: ScrollEffect;
  className?: string;
}

function ScrollRevealParagraph({
  children,
  effect = "blur",
  className,
}: ScrollRevealParagraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.5", "end 0.3"],
  });

  const ratchetedProgress = useMotionValue(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > ratchetedProgress.get()) {
      ratchetedProgress.set(latest);
    }
  });

  const extractText = (node: React.ReactNode): string => {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(" ");
    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<any>;
      if (element.props.children) {
        return extractText(element.props.children);
      }
    }
    return "";
  };

  const allText = extractText(children);
  const allWords = allText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = allWords.length;

  let globalWordIndex = 0;

  const processNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      const words = node.split(/(\s+)/);
      return words.map((segment, i) => {
        if (segment.trim().length === 0) {
          return segment;
        }

        const currentWordIndex = globalWordIndex;
        globalWordIndex++;

        const start = currentWordIndex / wordCount;
        const end = (currentWordIndex + 1) / wordCount;

        return (
          <ScrollRevealWord
            key={`word-${currentWordIndex}-${i}`}
            progress={ratchetedProgress}
            range={[start, end]}
            effect={effect}
          >
            {segment}
          </ScrollRevealWord>
        );
      });
    }

    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<any>;

      if (element.type === "img") {
        const neighborIndex = Math.max(0, globalWordIndex - 1);
        const start = neighborIndex / wordCount;
        const end = (neighborIndex + 1) / wordCount;

        return (
          <ScrollRevealWord
            key={`img-${neighborIndex}`}
            progress={ratchetedProgress}
            range={[start, end]}
            effect={effect}
          >
            {element}
          </ScrollRevealWord>
        );
      }

      if (element.props.style?.backgroundImage) {
        const innerText = extractText(element);
        const innerWords = innerText.split(/\s+/).filter((w) => w.length > 0);
        const startIndex = globalWordIndex;
        globalWordIndex += innerWords.length;
        const start = startIndex / wordCount;
        const end = (startIndex + innerWords.length) / wordCount;

        return (
          <ScrollRevealWord
            key={`bg-${startIndex}`}
            progress={ratchetedProgress}
            range={[start, end]}
            effect={effect}
          >
            {element}
          </ScrollRevealWord>
        );
      }

      return React.cloneElement(element, {
        ...element.props,
        children: React.Children.map(element.props.children, processNode),
      });
    }

    if (Array.isArray(node)) {
      return node.map((child, i) => (
        <React.Fragment key={i}>{processNode(child)}</React.Fragment>
      ));
    }

    return node;
  };

  return (
    <div ref={containerRef} className={className}>
      {processNode(children)}
    </div>
  );
}

function HeroParagraphSection({
  onVideoExpand,
}: {
  onVideoExpand: (id: string) => void;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <section className="flex flex-col items-center text-left lg:pt-32 lg:pb-32 md:pt-24 md:pb-24 pt-16 pb-16 px-4 laptop:px-8">
        <p className="font-serif text-2xl lg:text-[3rem] md:text-3xl text-stone-600 leading-relaxed w-full">
          We believe in the power of notetaking, not notetakers. Meetings should
          be moments of presence, not passive attendance.{" "}
          <img
            src="/handdrawing/sleeping.svg"
            alt="Presence"
            className="lg:size-12 md:size-10 size-8 inline-block"
          />
        </p>
        <ScrollRevealParagraph
          effect="blur"
          className="font-serif text-2xl lg:text-[3rem] md:text-3xl text-stone-600 leading-relaxed w-full"
        >
          <p className="lg:mt-18 md:mt-12 mt-8">
            AI changes it. Instead of{" "}
            <span
              style={{
                backgroundImage: "url(/handdrawing/scribbling.svg)",
                backgroundSize: "contain",
                backgroundPosition: "bottom",
                backgroundRepeat: "no-repeat",
              }}
            >
              {" "}
              scribbling{" "}
            </span>{" "}
            notes, it gives us the power to be present.
          </p>
          <p className="lg:mt-18 md:mt-12 mt-8">
            But we give it control over our meetings. What happens with all our
            calls and chats then? Services sunset{" "}
            <span>
              <img
                src="/handdrawing/sunset.svg"
                alt="Sunset"
                className="lg:size-12 md:size-10 size-8 inline-block"
              />
            </span>{" "}
            constantly, models change, progress is unstoppable.
          </p>
          <p className="lg:mt-18 md:mt-12 mt-8">
            We believe in owning your data, doesn't matter where it lives. More
            <span
              style={{
                backgroundImage: "url(/handdrawing/important.svg)",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {" "}
              important{" "}
            </span>{" "}
            is what you bring from every meeting, every call, every chat.
          </p>
          <p className="lg:mt-18 md:mt-12 mt-8">
            <span>
              <img
                src="/handdrawing/bracket-left.svg"
                alt="bracket left"
                className="lg:h-12 md:h-10 size-8 inline-block"
              />
              Char
              <img
                src="/handdrawing/bracket-right.svg"
                alt="bracket right"
                className="lg:h-12 md:h-10 size-8 inline-block"
              />
            </span>{" "}
            exists to preserve what makes us human: conversations that spark
            ideas, collaborations that move work forward. We build tools that
            amplify human agency, not replace it.
          </p>
          <p className="lg:mt-18 md:mt-12 mt-8">
            No ghost bots. No silent note lurkers. Just people,{" "}
            <span>
              thinking{" "}
              <img
                src="/handdrawing/thinking.svg"
                alt="thinking"
                className="lg:size-12 md:size-10 size-8 inline-block"
              />{" "}
            </span>
            together.
          </p>
        </ScrollRevealParagraph>

        <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-end gap-8 mt-12">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 mb-4">
              <Image
                src="/api/images/team/john.png"
                alt="John Jeong"
                width={32}
                height={32}
                className="rounded-full object-cover border border-neutral-200"
              />
              <Image
                src="/api/images/team/yujong.png"
                alt="Yujong Lee"
                width={32}
                height={32}
                className="rounded-full object-cover border border-neutral-200"
              />
            </div>

            <div>
              <p className="text-base text-neutral-600 font-medium italic font-serif">
                Hyprnote
              </p>
              <p className="text-sm text-neutral-500">John Jeong, Yujong Lee</p>
            </div>

            <div>
              <Image
                src="/handdrawing/char-signature.svg"
                alt="Hyprnote Signature"
                width={124}
                height={60}
                layout="constrained"
                className="opacity-80 object-contain"
              />
            </div>
          </div>

          <div className="relative aspect-video w-full md:w-auto md:min-w-32 md:max-w-64 rounded-lg overflow-hidden border border-neutral-200 shrink-0">
            <VideoThumbnail
              playbackId={MUX_PLAYBACK_ID}
              onPlay={() => onVideoExpand(MUX_PLAYBACK_ID)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ValuePropsGrid({
  valueProps,
}: {
  valueProps: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
  }>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-t border-neutral-100">
      {valueProps.map((prop, index) => (
        <div
          key={prop.title}
          className={cn([
            "p-6 text-left border-b md:border-b-0",
            index < valueProps.length - 1 && "md:border-r",
            "border-neutral-100",
          ])}
        >
          <h3 className="font-medium mb-1 text-neutral-900 font-mono">
            {prop.title}
          </h3>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {prop.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function TestimonialsSection() {
  return (
    <section>
      <div className="text-center">
        <p className="font-medium text-neutral-600 uppercase tracking-wide py-12 font-serif">
          Loved by professionals at
        </p>

        <LogoCloud />

        <div className="w-full">
          <TestimonialsMobileGrid />
          <TestimonialsDesktopGrid />
        </div>
      </div>
    </section>
  );
}

function TestimonialsMobileGrid() {
  return (
    <div className="md:hidden flex flex-col">
      <SocialCard
        platform="reddit"
        author="spilledcarryout"
        subreddit="macapps"
        body="Dear Hyprnote Team,

I wanted to take a moment to commend you on the impressive work you've done with Hyprnote. Your commitment to privacy, on-device AI, and transparency is truly refreshing in today's software landscape. The fact that all transcription and summarization happens locally and live!—without compromising data security—makes Hyprnote a standout solution, especially for those of us in compliance-sensitive environments.

The live transcription is key for me. It saves a landmark step to transcribe each note myself using macwhisper. Much more handy they way you all do this. The Calendar function is cool too.

I am a telephysician and my notes are much more quickly done. Seeing 6-8 patients daily and tested it yesteday. So yes, my job is session heavy. Add to that being in psychiatry where document making sessions become voluminous, my flow is AI dependent to make reports stand out. Accuracy is key for patient care.

Hyprnote is now part of that process.

Thank you for your dedication and for building a tool that not only saves time, but also gives peace of mind. I look forward to seeing Hyprnote continue to evolve

Cheers!"
        url="https://www.reddit.com/r/macapps/comments/1lo24b9/comment/n15dr0t/"
        className="border-x-0 border-t-0"
      />

      <SocialCard
        platform="linkedin"
        author="Flavius Catalin Miron"
        role="Product Engineer"
        company="Waveful"
        body="Guys at Hyprnote (YC S25) are wild.

Had a call with John Jeong about their product (privacy-first AI notepad).

Next day? They already shipped a first version of the context feature we discussed 🤯

24 𝐡𝐨𝐮𝐫𝐬. A conversation turned into production

As Product Engineer at Waveful, where we also prioritize rapid execution, I deeply respect this level of speed.

The ability to ship this fast while maintaining quality, is what separates great teams from the rest 🔥

Btw give an eye to Hyprnote:
100% local AI processing
Zero cloud dependency
Real privacy
Almost daily releases

Their repo: https://lnkd.in/dKCtxkA3 (mac only rn but they're releasing for windows very soon)

Been using it for daily tasks, even simple note-taking is GREAT because I can review everything late, make action points etc.

Mad respect to the team. This is how you build in 2025. 🚀"
        url="https://www.linkedin.com/posts/flaviews_guys-at-hyprnote-yc-s25-are-wild-had-activity-7360606765530386434-Klj-"
        className="border-x-0 border-t-0"
      />

      <SocialCard
        platform="twitter"
        author="yoran was here"
        username="yoran_beisher"
        body="Been using Hypernote for a while now, truly one of the best AI apps I've used all year. Like they said, the best thing since sliced bread"
        url="https://x.com/yoran_beisher/status/1953147865486012611"
        className="border-x-0 border-t-0"
      />

      <SocialCard
        platform="twitter"
        author="Tom Yang"
        username="tomyang11_"
        body="I love the flexibility that @tryhyprnote gives me to integrate personal notes with AI summaries. I can quickly jot down important points during the meeting without getting distracted, then trust that the AI will capture them in full detail for review afterwards."
        url="https://twitter.com/tomyang11_/status/1956395933538902092"
        className="border-x-0 border-t-0 border-b-0"
      />
    </div>
  );
}

function TestimonialsDesktopGrid() {
  return (
    <div className="hidden md:grid md:grid-cols-3">
      <div className="row-span-2">
        <SocialCard
          platform="reddit"
          author="spilledcarryout"
          subreddit="macapps"
          body="Dear Hyprnote Team,

I wanted to take a moment to commend you on the impressive work you've done with Hyprnote. Your commitment to privacy, on-device AI, and transparency is truly refreshing in today's software landscape. The fact that all transcription and summarization happens locally and live!—without compromising data security—makes Hyprnote a standout solution, especially for those of us in compliance-sensitive environments.

The live transcription is key for me. It saves a landmark step to transcribe each note myself using macwhisper. Much more handy they way you all do this. The Calendar function is cool too.

I am a telephysician and my notes are much more quickly done. Seeing 6-8 patients daily and tested it yesteday. So yes, my job is session heavy. Add to that being in psychiatry where document making sessions become voluminous, my flow is AI dependent to make reports stand out. Accuracy is key for patient care.

Hyprnote is now part of that process.

Thank you for your dedication and for building a tool that not only saves time, but also gives peace of mind. I look forward to seeing Hyprnote continue to evolve

Cheers!"
          url="https://www.reddit.com/r/macapps/comments/1lo24b9/comment/n15dr0t/"
          className="w-full h-full border-l-0 border-r-0 border-b-0"
        />
      </div>

      <div className="row-span-2">
        <SocialCard
          platform="linkedin"
          author="Flavius Catalin Miron"
          role="Product Engineer"
          company="Waveful"
          body="Guys at Hyprnote (YC S25) are wild.

Had a call with John Jeong about their product (privacy-first AI notepad).

Next day? They already shipped a first version of the context feature we discussed 🤯

24 𝐡𝐨𝐮𝐫𝐬. A conversation turned into production

As Product Engineer at Waveful, where we also prioritize rapid execution, I deeply respect this level of speed.

The ability to ship this fast while maintaining quality, is what separates great teams from the rest 🔥

Btw give an eye to Hyprnote:
100% local AI processing
Zero cloud dependency
Real privacy
Almost daily releases

Their repo: https://lnkd.in/dKCtxkA3 (mac only rn but they're releasing for windows very soon)

Been using it for daily tasks, even simple note-taking is GREAT because I can review everything late, make action points etc.

Mad respect to the team. This is how you build in 2025. 🚀"
          url="https://www.linkedin.com/posts/flaviews_guys-at-hyprnote-yc-s25-are-wild-had-activity-7360606765530386434-Klj-"
          className="w-full h-full border-r-0 border-b-0"
        />
      </div>

      <div className="h-65">
        <SocialCard
          platform="twitter"
          author="yoran was here"
          username="yoran_beisher"
          body="Been using Hypernote for a while now, truly one of the best AI apps I've used all year. Like they said, the best thing since sliced bread"
          url="https://x.com/yoran_beisher/status/1953147865486012611"
          className="w-full h-full overflow-hidden border-r-0 border-b-0"
        />
      </div>

      <div className="h-65">
        <SocialCard
          platform="twitter"
          author="Tom Yang"
          username="tomyang11_"
          body="I love the flexibility that @tryhyprnote gives me to integrate personal notes with AI summaries. I can quickly jot down important points during the meeting without getting distracted, then trust that the AI will capture them in full detail for review afterwards."
          url="https://twitter.com/tomyang11_/status/1956395933538902092"
          className="w-full h-full overflow-hidden border-r-0 border-b-0"
        />
      </div>
    </div>
  );
}

export function CoolStuffSection() {
  return (
    <section>
      <div className="text-center border-b border-neutral-100">
        <p className="font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
          Secure by Design
        </p>
      </div>

      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="border-r border-neutral-100 flex flex-col">
          <div className="p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Icon
                icon="mdi:robot-off-outline"
                className="text-3xl text-stone-600"
              />
              <h3 className="text-2xl font-serif text-stone-600">No bots</h3>
            </div>
            <p className="text-base text-neutral-600 leading-relaxed">
              Captures system audio—no bots join your calls.
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <Image
              src="/api/images/hyprnote/no-bots.jpg"
              alt="No bots interface"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:wifi-off" className="text-3xl text-stone-600" />
              <h3 className="text-2xl font-serif text-stone-600">
                Fully local option
              </h3>
            </div>
            <p className="text-base text-neutral-600 leading-relaxed">
              Audio, transcripts, and notes stay on your device as files.
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <Image
              src="/api/images/hyprnote/no-wifi.png"
              alt="No internet interface"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="border-b border-neutral-100">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Icon
                icon="mdi:robot-off-outline"
                className="text-2xl text-stone-600"
              />
              <h3 className="text-xl font-serif text-stone-600">No bots</h3>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Captures system audio—no bots join your calls.
            </p>
          </div>
          <div className="overflow-hidden">
            <Image
              src="/api/images/hyprnote/no-bots.jpg"
              alt="No bots interface"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
        <div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Icon icon="mdi:wifi-off" className="text-2xl text-stone-600" />
              <h3 className="text-xl font-serif text-stone-600">
                Fully local option
              </h3>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Audio, transcripts, and notes stay on your device as files.
            </p>
          </div>
          <div className="overflow-hidden">
            <Image
              src="/api/images/hyprnote/no-wifi.png"
              alt="No internet interface"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const [typedText1, setTypedText1] = useState("");
  const [typedText2, setTypedText2] = useState("");
  const [enhancedLines, setEnhancedLines] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "notes" | "summary" | "transcription"
  >("notes");

  const text1 = "metrisc w/ john";
  const text2 = "stakehlder mtg";

  useEffect(() => {
    const runAnimation = () => {
      setTypedText1("");
      setTypedText2("");
      setEnhancedLines(0);
      setActiveTab("notes");

      let currentIndex1 = 0;
      setTimeout(() => {
        const interval1 = setInterval(() => {
          if (currentIndex1 < text1.length) {
            setTypedText1(text1.slice(0, currentIndex1 + 1));
            currentIndex1++;
          } else {
            clearInterval(interval1);

            let currentIndex2 = 0;
            const interval2 = setInterval(() => {
              if (currentIndex2 < text2.length) {
                setTypedText2(text2.slice(0, currentIndex2 + 1));
                currentIndex2++;
              } else {
                clearInterval(interval2);

                setTimeout(() => {
                  setActiveTab("summary");

                  setTimeout(() => {
                    setEnhancedLines(1);
                    setTimeout(() => {
                      setEnhancedLines(2);
                      setTimeout(() => {
                        setEnhancedLines(3);
                        setTimeout(() => {
                          setEnhancedLines(4);
                          setTimeout(() => {
                            setEnhancedLines(5);
                            setTimeout(() => {
                              setEnhancedLines(6);
                              setTimeout(() => {
                                setEnhancedLines(7);
                                setTimeout(() => runAnimation(), 2000);
                              }, 800);
                            }, 800);
                          }, 800);
                        }, 800);
                      }, 800);
                    }, 800);
                  }, 300);
                }, 800);
              }
            }, 50);
          }
        }, 50);
      }, 500);
    };

    runAnimation();
  }, []);

  return (
    <section>
      <div className="flex flex-col items-center gap-4 pt-16 pb-8 text-center">
        <h2 className="text-4xl text-neutral-600 tracking-wide font-serif">
          All your meetings stay yours.
        </h2>
        <p className="text-md text-neutral-600 mx-auto pb-4">
          We believe that file is more important than software. <br />
          All saves locally, in plain markdown
          <span className="text-neutral-400">.md</span>
        </p>
        <DownloadButton />
      </div>
      <div className="flex justify-center pt-16 sm:pt-24 px-4 sm:px-8 overflow-hidden">
        <MockWindow
          showAudioIndicator={activeTab === "notes"}
          audioIndicatorColor="#ef4444"
          audioIndicatorWidth={120}
          headerClassName={activeTab === "notes" ? "bg-red-100" : undefined}
        >
          <div className="flex border-b border-neutral-200 text-sm">
            {(["notes", "summary", "transcription"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn([
                  "px-4 py-2 transition-colors",
                  activeTab === tab
                    ? "text-neutral-900 border-b-2 border-neutral-900"
                    : "text-neutral-400 hover:text-neutral-600",
                ])}
              >
                {tab === "notes"
                  ? "Your Notes"
                  : tab === "summary"
                    ? "Summary"
                    : "Transcription"}
              </button>
            ))}
          </div>

          <div className="p-6 h-75 overflow-hidden">
            {activeTab === "notes" && (
              <div>
                <div className="text-neutral-700">ui update - moble</div>
                <div className="text-neutral-700">api</div>
                <div className="text-neutral-700 mt-4">new dash - urgnet</div>
                <div className="text-neutral-700">a/b tst next wk</div>
                <div className="text-neutral-700 mt-4">
                  {typedText1}
                  {typedText1 && typedText1.length < text1.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </div>
                <div className="text-neutral-700">
                  {typedText2}
                  {typedText2 && typedText2.length < text2.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </div>
              </div>
            )}

            {activeTab === "summary" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h4
                    className={cn([
                      "text-lg font-semibold text-stone-700 transition-opacity duration-500",
                      enhancedLines >= 1 ? "opacity-100" : "opacity-0",
                    ])}
                  >
                    Mobile UI Update and API Adjustments
                  </h4>
                  <ul className="flex flex-col gap-2 text-neutral-700 list-disc pl-5">
                    <li
                      className={cn([
                        "transition-opacity duration-500",
                        enhancedLines >= 2 ? "opacity-100" : "opacity-0",
                      ])}
                    >
                      Sarah presented the new mobile UI update, which includes a
                      streamlined navigation bar and improved button placements
                      for better accessibility.
                    </li>
                    <li
                      className={cn([
                        "transition-opacity duration-500",
                        enhancedLines >= 3 ? "opacity-100" : "opacity-0",
                      ])}
                    >
                      Ben confirmed that API adjustments are needed to support
                      dynamic UI changes, particularly for fetching personalized
                      user data more efficiently.
                    </li>
                    <li
                      className={cn([
                        "transition-opacity duration-500",
                        enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                      ])}
                    >
                      The UI update will be implemented in phases, starting with
                      core navigation improvements. Ben will ensure API
                      modifications are completed before development begins.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <h4
                    className={cn([
                      "font-semibold text-stone-700 transition-opacity duration-500",
                      enhancedLines >= 5 ? "opacity-100" : "opacity-0",
                    ])}
                  >
                    New Dashboard – Urgent Priority
                  </h4>
                  <ul className="flex flex-col gap-2 text-sm text-neutral-700 list-disc pl-5">
                    <li
                      className={cn([
                        "transition-opacity duration-500",
                        enhancedLines >= 6 ? "opacity-100" : "opacity-0",
                      ])}
                    >
                      Alice emphasized that the new analytics dashboard must be
                      prioritized due to increasing stakeholder demand.
                    </li>
                    <li
                      className={cn([
                        "transition-opacity duration-500",
                        enhancedLines >= 7 ? "opacity-100" : "opacity-0",
                      ])}
                    >
                      The new dashboard will feature real-time user engagement
                      metrics and a customizable reporting system.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "transcription" && (
              <div className="flex flex-col gap-3 text-sm">
                <div className="text-neutral-700">
                  <span className="font-medium text-neutral-900">Sarah:</span>{" "}
                  So the mobile UI update is looking good. We've streamlined the
                  nav bar and improved button placements.
                </div>
                <div className="text-neutral-700">
                  <span className="font-medium text-neutral-900">Ben:</span>{" "}
                  I'll need to adjust the API to support dynamic UI changes,
                  especially for personalized user data.
                </div>
                <div className="text-neutral-700">
                  <span className="font-medium text-neutral-900">Alice:</span>{" "}
                  The new dashboard is urgent. Stakeholders have been asking
                  about it every day.
                </div>
                <div className="text-neutral-700">
                  <span className="font-medium text-neutral-900">Mark:</span> We
                  should align the dashboard launch with our marketing push next
                  quarter.
                </div>
              </div>
            )}
          </div>
        </MockWindow>
      </div>

      <div className="flex flex-col md:flex-row md:h-80 border-t border-neutral-200 divide-y md:divide-x divide-neutral-200 md:*:w-1/3 *:w-full *:px-8 *:lg:pt-16 *:pt-8 *:pb-8">
        <div className="flex flex-col justify-between ">
          <div className="flex h-20 items-center justify-left gap-6">
            <Icon icon="mdi:wifi-off" className="text-2xl text-stone-600" />
            <div className="flex item-center py-2 px-2  bg-red-100 rounded-md border border-red-300">
              <DancingSticks
                amplitude={1}
                height={24}
                width={120}
                color="#ef4444"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 md:gap-4">
            <h4 className="text-lg font-serif text-stone-700">
              Use local models or use Your Own key
            </h4>
            <p className="text-md text-neutral-500">
              Hyprnote work with various transcription models right on your
              device, even without internet.
            </p>
          </div>
        </div>

        <div className="group flex flex-col gap-8 sm:gap-4 justify-between">
          <div className="flex md:min-h-20 items-center justify-left gap-6">
            <div className="relative flex w-full lg:h-full h-16 items-center justify-center py-2 px-2 rounded-md border-2 border-dashed border-green-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
                <Icon
                  icon="mdi:file-upload"
                  className="text-2xl text-stone-600"
                />
              </div>

              <div className="absolute lg:bottom-1/4 lg:right-1/4 lg:translate-x-[5%] lg:-translate-y-[5%] rotate-8 group-hover:translate-x-[10%] group-hover:translate-y-[10%]  group-hover:-translate-y-[50%] group-hover:rotate-6 transition-all duration-500 ease-out flex flex-row items-center gap-2 pl-2 pr-4 py-2 rounded-md bg-gray-100 border border-gray-300 shadow-lg text-nowrap">
                <img
                  src="/icons/grabbed-cursor.svg"
                  className="absolute top-1/2 left-1/2 w-8 h-8"
                  alt=""
                />
                <Icon
                  icon="mdi:file-outline"
                  className="text-2xl text-stone-600"
                />
                <div className="flex flex-col">
                  <p className="text-md text-neutral-600">
                    Meeting.12.03.26-11.32.wav
                  </p>
                  <p className="text-sm text-neutral-300">14:30:25</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:gap-4">
            <h4 className="text-lg font-serif text-stone-700">
              Upload records or existing transcripts
            </h4>
            <p className="text-md text-neutral-500">
              Hyprnote work with various transcription models right on your
              device, even without internet
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-8 sm:gap-4 px-8 pt-16 pb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-between gap-2 md:gap-3 rounded-xl bg-gradient-to-t from-white to-stone-100 border border-neutral-200 shadow-lg px-4 py-3 text-nowrap w-full">
              <div className="flex items-center gap-2 md:gap-3">
                <Icon
                  icon="mdi:video"
                  className="text-xl text-stone-500 shrink-0"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-neutral-400">1-1 with Joanna</p>
                  <p className="text-sm font-medium text-neutral-500">
                    AI Notetaker joined the call.
                  </p>
                </div>
              </div>
              <button className="ml-2 shrink-0 text-neutral-300 hover:text-neutral-500 transition-colors">
                <Icon icon="mdi:close" className="text-base" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:gap-4">
            <h4 className="text-lg font-serif text-stone-700">
              No bot on calls
            </h4>
            <p className="text-md text-neutral-500">
              Char is connecting right to your system audio and get every word
              perfectly, no faceless bots join your meetings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AISection() {
  const researchStatuses = [
    "Exploring meetings",
    "Analysing",
    "Generating summary",
  ];
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % researchStatuses.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <div className="flex flex-col items-center gap-4 pt-16 pb-8 px-4 text-center">
        <h2 className="md:text-4xl text-2xl text-neutral-700 tracking-wide font-serif">
          Get more from every note with AI assistant
        </h2>
        <p className="text-md text-neutral-500 mx-auto pb-4">
          Ask, give tasks to execute and grow your team knowledge base.
        </p>
        <a
          href="/product/ai-assistant/"
          className="text-md underline text-neutral-600 hover:text-neutral-800"
        >
          More about AI
        </a>
      </div>
      <div className="flex justify-center px-4 sm:px-8 pb-16 overflow-hidden">
        <MockChatInput />
      </div>

      <div className="flex flex-col md:flex-row md:h-80 border-t border-neutral-200 divide-y md:divide-x divide-neutral-200 md:*:w-1/3 *:w-full">
        <div className="flex flex-col justify-between px-8 pt-16 pb-8">
          <div className="flex h-16 items-center gap-4">
            {[
              { name: "Slack", image: "slack.jpg" },
              { name: "Linear", image: "linear.jpg" },
              { name: "Notion", image: "notion.jpg" },
            ].map((integration) => (
              <div
                key={integration.name}
                className="size-12 rounded-xl overflow-hidden border border-neutral-100/50 bg-white shrink-0 shadow-md hover:scale-110 transition-all duration-500"
              >
                <Image
                  src={`/api/images/icons/${integration.image}`}
                  alt={integration.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 md:gap-4">
            <h4 className="text-lg font-serif text-stone-700">
              Workflows and integrations
            </h4>
            <p className="text-md text-neutral-500">
              Automate follow-up tasks across your tools without manual data
              entry.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between px-6 pb-8">
          <div className="flex items-center justify-center pb-4 relative">
            <div className="flex flex-col w-2/3 rounded-b-xl border-r border-b border-l border-neutral-200 pt-24 overflow-hidden">
              <div className="flex items-center absolute top-6 left-1/2 -translate-x-1/2 bg-linear-to-t from-stone-100 to-white w-full gap-2 px-2 pl-2 py-2 rounded-lg shadow-lg border border-neutral-200">
                <span className="flex-1 text-sm text-stone-500">
                  What was John's tasks from previous call?
                </span>
                <div className="flex items-center justify-center size-7 rounded-lg shrink-0 transition-colors bg-stone-600 text-white">
                  <Icon icon="mdi:arrow-up" className="text-base" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 px-3 pb-3 *:hover:scale-110 *:transition-all *:duration-500">
                <div className="flex items-center justify-center size-10 rounded-full bg-neutral-600 text-white">
                  <Icon icon="mdi:monitor-share" className="text-base" />
                </div>
                <div className="flex items-center justify-center size-10 rounded-full bg-neutral-600 text-white">
                  <Icon icon="mdi:dots-vertical" className="text-lg" />
                </div>
                <div className="flex items-center justify-center h-10 px-5 rounded-full bg-red-500 text-white">
                  <Icon icon="mdi:phone-hangup" className="text-lg" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:gap-4 px-2">
            <h4 className="text-lg font-serif text-stone-700">
              Ask questions in realtime
            </h4>
            <p className="text-md text-neutral-500">
              Get instant answers from your current calls and previous meetings.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between px-8 pt-16 pb-8">
          <div className="flex h-20 items-center">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 shadow-lg px-4 py-3 w-full">
              <div className="flex items-center justify-center size-8 rounded-full bg-violet-100 text-violet-600 text-xs font-semibold shrink-0">
                JJ
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
                <p className="text-xs text-neutral-400">John Jeong's progress</p>
                <div className="relative h-5">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={statusIndex}
                      initial={{ y: -8, opacity: 0, filter: "blur(12px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      exit={{ y: 8, opacity: 0, filter: "blur(12px)" }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="text-sm font-medium text-neutral-500 absolute inset-0 text-shimmer"
                    >
                      {researchStatuses[statusIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:gap-4">
            <h4 className="text-lg font-serif text-stone-700">
              Deep research of your chats
            </h4>
            <p className="text-md text-neutral-500">
              Chat with your AI assistant to learn more about the people you're
              meeting with.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GrowsWithYouSection() {
  return (
    <section>
      <div className="flex flex-col items-center gap-4 pt-16 pb-8 text-center px-4">
        <h2 className="md:text-4xl text-2xl text-neutral-700 tracking-wide font-serif">
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

export function MainFeaturesSection({
  featuresScrollRef,
  selectedFeature,
  setSelectedFeature,
  scrollToFeature,
}: {
  featuresScrollRef: React.RefObject<HTMLDivElement | null>;
  selectedFeature: number;
  setSelectedFeature: (index: number) => void;
  scrollToFeature: (index: number) => void;
}) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const handleFeatureIndexChange = useCallback(
    (nextIndex: number) => {
      setSelectedFeature(nextIndex);
      setProgress(0);
      progressRef.current = 0;
    },
    [setSelectedFeature],
  );

  useEffect(() => {
    const startTime =
      Date.now() - (progressRef.current / 100) * FEATURES_AUTO_ADVANCE_DURATION;
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(
        (elapsed / FEATURES_AUTO_ADVANCE_DURATION) * 100,
        100,
      );
      setProgress(newProgress);
      progressRef.current = newProgress;

      if (newProgress >= 100) {
        const currentActiveIndex =
          activeFeatureIndices.indexOf(selectedFeature);
        const nextActiveIndex =
          (currentActiveIndex + 1) % activeFeatureIndices.length;
        const nextIndex = activeFeatureIndices[nextActiveIndex];
        setSelectedFeature(nextIndex);
        setProgress(0);
        progressRef.current = 0;
        if (featuresScrollRef.current) {
          const container = featuresScrollRef.current;
          const scrollLeft = container.offsetWidth * nextIndex;
          container.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
          });
        }
      } else {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [selectedFeature, setSelectedFeature, featuresScrollRef]);

  const handleScrollToFeature = (index: number) => {
    scrollToFeature(index);
    setProgress(0);
    progressRef.current = 0;
  };

  return (
    <section>
      <div className="text-center py-16 px-4">
        <div className="mb-6 mx-auto size-28 shadow-xl border border-neutral-100 flex justify-center items-center rounded-4xl bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Char"
            width={96}
            height={96}
            className="size-24 rounded-3xl border border-neutral-100"
          />
        </div>
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Works like charm
        </h2>
        <p className="text-neutral-600 max-w-lg mx-auto">
          {
            "Super simple and easy to use with its clean interface. And it's getting better with every update — every single week."
          }
        </p>
      </div>
      <FeaturesMobileCarousel
        featuresScrollRef={featuresScrollRef}
        selectedFeature={selectedFeature}
        onIndexChange={handleFeatureIndexChange}
        scrollToFeature={handleScrollToFeature}
        progress={progress}
      />
      <FeaturesDesktopGrid />
    </section>
  );
}

function FeaturesMobileCarousel({
  featuresScrollRef,
  selectedFeature,
  onIndexChange,
  scrollToFeature,
  progress,
}: {
  featuresScrollRef: React.RefObject<HTMLDivElement | null>;
  selectedFeature: number;
  onIndexChange: (index: number) => void;
  scrollToFeature: (index: number) => void;
  progress: number;
}) {
  const isSwiping = useRef(false);

  return (
    <div className="max-[800px]:block hidden">
      <div
        ref={featuresScrollRef}
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        onTouchStart={() => {
          isSwiping.current = true;
          onIndexChange(selectedFeature);
        }}
        onTouchEnd={() => {
          isSwiping.current = false;
        }}
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollLeft = container.scrollLeft;
          const itemWidth = container.offsetWidth;
          const index = Math.round(scrollLeft / itemWidth);
          if (index !== selectedFeature) {
            onIndexChange(index);
          }
        }}
      >
        <div className="flex">
          {mainFeatures.map((feature, index) => (
            <div key={index} className="w-full shrink-0 snap-center">
              <div className="border-y border-neutral-100 overflow-hidden flex flex-col">
                <Link
                  to={feature.link}
                  className={cn([
                    "aspect-video border-b border-neutral-100 overflow-hidden relative block",
                    (feature.image || feature.muxPlaybackId) &&
                      "bg-neutral-100",
                  ])}
                >
                  {feature.muxPlaybackId ? (
                    <MobileFeatureVideo
                      playbackId={feature.muxPlaybackId}
                      alt={`${feature.title} feature`}
                      isActive={selectedFeature === index}
                    />
                  ) : feature.image ? (
                    <Image
                      src={feature.image}
                      alt={`${feature.title} feature`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src="/api/images/hyprnote/static.webp"
                      alt={`${feature.title} feature`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </Link>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon
                      icon={feature.icon}
                      className="text-2xl text-stone-600"
                    />
                    <h3 className="text-lg font-serif text-stone-600">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 py-6">
        {mainFeatures.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToFeature(index)}
            className={cn([
              "h-1 rounded-full cursor-pointer overflow-hidden",
              selectedFeature === index
                ? "w-8 bg-neutral-300"
                : "w-8 bg-neutral-300 hover:bg-neutral-400",
            ])}
            aria-label={`Go to feature ${index + 1}`}
          >
            {selectedFeature === index && (
              <div
                className="h-full bg-stone-600 transition-none"
                style={{ width: `${progress}%` }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileFeatureVideo({
  playbackId,
  alt,
  isActive,
}: {
  playbackId: string;
  alt: string;
  isActive: boolean;
}) {
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1920&height=1080&fit_mode=smartcrop`;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isActive) {
      player.play()?.catch(() => {
        // Autoplay blocked or player not ready - fail silently
      });
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isActive]);

  return (
    <div className="w-full h-full relative">
      <img
        src={thumbnailUrl}
        alt={alt}
        className={cn([
          "w-full h-full object-contain absolute inset-0 transition-opacity duration-300",
          isActive ? "opacity-0" : "opacity-100",
        ])}
      />
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        muted
        loop
        playsInline
        maxResolution="1080p"
        minResolution="720p"
        className={cn([
          "w-full h-full object-contain transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0",
        ])}
        style={
          {
            "--controls": "none",
          } as React.CSSProperties & { [key: `--${string}`]: string }
        }
      />
    </div>
  );
}

function FeatureVideo({
  playbackId,
  alt,
  isHovered,
}: {
  playbackId: string;
  alt: string;
  isHovered: boolean;
}) {
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1920&height=1080&fit_mode=smartcrop`;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isHovered) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <div className="w-full h-full relative">
      <img
        src={thumbnailUrl}
        alt={alt}
        className={cn([
          "w-full h-full object-contain absolute inset-0 transition-opacity duration-300",
          isHovered ? "opacity-0" : "opacity-100",
        ])}
      />
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        muted
        loop
        playsInline
        maxResolution="1080p"
        minResolution="720p"
        className={cn([
          "w-full h-full object-contain transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0",
        ])}
        style={
          {
            "--controls": "none",
          } as React.CSSProperties & { [key: `--${string}`]: string }
        }
      />
    </div>
  );
}

function FeaturesDesktopGrid() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const gridClasses = [
    "col-span-6 md:col-span-3 border-r border-b",
    "col-span-6 md:col-span-3 border-b",
    "col-span-6 md:col-span-2 border-r",
    "col-span-6 md:col-span-2 border-r",
    "col-span-6 md:col-span-2",
  ];

  return (
    <div className="min-[800px]:grid hidden grid-cols-6">
      {mainFeatures.map((feature, index) => (
        <div
          key={index}
          className={cn(
            gridClasses[index],
            "border-neutral-100 overflow-hidden flex flex-col",
          )}
        >
          <Link
            to={feature.link}
            className={cn([
              "aspect-video border-b border-neutral-100 overflow-hidden relative group block",
              (feature.image || feature.muxPlaybackId) && "bg-neutral-100",
            ])}
            onMouseEnter={() => setHoveredFeature(index)}
            onMouseLeave={() => setHoveredFeature(null)}
          >
            {feature.muxPlaybackId ? (
              <FeatureVideo
                playbackId={feature.muxPlaybackId}
                alt={`${feature.title} feature`}
                isHovered={hoveredFeature === index}
              />
            ) : feature.image ? (
              <Image
                src={feature.image}
                alt={`${feature.title} feature`}
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src="/api/images/hyprnote/static.webp"
                alt={`${feature.title} feature`}
                className="w-full h-full object-cover"
              />
            )}
          </Link>
          <div className="p-6 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Icon icon={feature.icon} className="text-2xl text-stone-600" />
              <h3 className="text-lg font-serif text-stone-600">
                {feature.title}
              </h3>
            </div>
            <p className="text-sm text-neutral-600">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const templateCategories = [
  {
    icon: "mdi:handshake-outline",
    category: "Sales",
    description: "Close deals with organized discovery and follow-ups",
    templates: ["Sales Discovery Call", "Client Kickoff", "Investor Pitch"],
  },
  {
    icon: "mdi:lightbulb-outline",
    category: "Product",
    description: "Build the right things with clear alignment",
    templates: [
      "Product Roadmap Review",
      "Brainstorming Session",
      "Project Kickoff",
    ],
  },
  {
    icon: "mdi:code-braces",
    category: "Engineering",
    description: "Ship faster with focused technical discussions",
    templates: [
      "Sprint Planning",
      "Sprint Retrospective",
      "Technical Design Review",
    ],
  },
];

export function TemplatesSection() {
  return (
    <section>
      <div className="text-center py-12 px-4 laptop:px-0">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          A template for every meeting
        </h2>
        <p className="text-neutral-600">
          Char adapts to how you work with customizable templates for any
          meeting type
        </p>
      </div>

      <TemplatesMobileView />
      <TemplatesDesktopView />

      <div className="text-center py-8 border-t border-neutral-100">
        <Link
          to="/gallery/"
          search={{ type: "template" }}
          className={cn([
            "inline-flex items-center gap-2",
            "text-stone-600 hover:text-stone-800",
            "font-medium transition-colors",
          ])}
        >
          View all templates
          <Icon icon="mdi:arrow-right" className="text-lg" />
        </Link>
      </div>
    </section>
  );
}

function TemplatesMobileView() {
  return (
    <div className="md:hidden border-t border-neutral-100">
      {templateCategories.map((category, index) => (
        <div
          key={category.category}
          className={cn([
            "p-6",
            index < templateCategories.length - 1 &&
              "border-b border-neutral-100",
          ])}
        >
          <div className="flex items-center gap-3 mb-3">
            <Icon icon={category.icon} className="text-2xl text-stone-600" />
            <h3 className="text-lg font-serif text-stone-600">
              {category.category}
            </h3>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            {category.description}
          </p>
          <div className="text-left">
            {category.templates.map((template, i) => (
              <span
                key={template}
                className="text-[11px] font-mono text-stone-400"
              >
                {template}
                {i < category.templates.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplatesDesktopView() {
  return (
    <div className="hidden md:grid grid-cols-3 border-t border-neutral-100">
      {templateCategories.map((category, index) => (
        <div
          key={category.category}
          className={cn([
            "p-6",
            index < templateCategories.length - 1 &&
              "border-r border-neutral-100",
          ])}
        >
          <div className="flex items-center gap-3 mb-3">
            <Icon icon={category.icon} className="text-2xl text-stone-600" />
            <h3 className="text-lg font-serif text-stone-600">
              {category.category}
            </h3>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            {category.description}
          </p>
          <div className="text-left">
            {category.templates.map((template, i) => (
              <span
                key={template}
                className="text-[11px] font-mono text-stone-400"
              >
                {template}
                {i < category.templates.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQSection() {
  return (
    <section className="py-16 px-4 laptop:px-0">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-stone-600 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <FAQ>
          <FAQItem question="What languages does Char support?">
            45+ languages including English, Spanish, French, German, Japanese,
            Mandarin, and more.
          </FAQItem>

          <FAQItem question="Can I import existing recordings?">
            Yes. Upload audio files or transcripts to turn them into searchable,
            summarized notes.
          </FAQItem>

          <FAQItem question="Does Char train AI models on my data?">
            No. Char does not use your recordings, transcripts, or notes to
            train AI models. When using cloud providers, your data is processed
            according to their privacy policies, but Char itself never collects
            or uses your data for training.
          </FAQItem>

          <FAQItem question="Is Char safe?">
            Char doesn't store your conversations. Every meeting audio,
            transcript, and note is a file on your computer. You decide if your
            data ever leaves your device.
          </FAQItem>

          <FAQItem question="How is Char different from other AI note-takers?">
            Plain markdown files instead of proprietary databases. System audio
            capture instead of meeting bots. Your choice of AI provider instead
            of vendor lock-in. Open source instead of a black box.
          </FAQItem>
        </FAQ>
      </div>
    </section>
  );
}

function ManifestoSection() {
  return (
    <section className="py-16 px-4 laptop:px-0 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <div className="max-w-4xl mx-auto">
        <div
          className="border border-neutral-200 p-4"
          style={{
            backgroundImage: "url(/api/images/texture/white-leather.png)",
          }}
        >
          <div
            className="bg-stone-50 border border-neutral-200 rounded-xs p-8 sm:p-12"
            style={{
              backgroundImage: "url(/api/images/texture/paper.png)",
            }}
          >
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-4">
              Our manifesto
            </h2>

            <div className="flex flex-col gap-4 text-neutral-700 leading-relaxed">
              <p>
                We believe in the power of notetaking, not notetakers. Meetings
                should be moments of presence, not passive attendance. If you
                are not adding value, your time is better spent elsewhere for
                you and your team.
              </p>
              <p>
                Char exists to preserve what makes us human: conversations that
                spark ideas, collaborations that move work forward. We build
                tools that amplify human agency, not replace it. No ghost bots.
                No silent note lurkers. Just people, thinking together.
              </p>
              <p>
                We stand with those who value real connection and purposeful
                collaboration.
              </p>
            </div>

            <div className="flex gap-2 mt-12 mb-4">
              <Image
                src="/api/images/team/john.png"
                alt="John Jeong"
                width={32}
                height={32}
                className="rounded-full object-cover border border-neutral-200"
              />
              <Image
                src="/api/images/team/yujong.png"
                alt="Yujong Lee"
                width={32}
                height={32}
                className="rounded-full object-cover border border-neutral-200"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-base text-neutral-600 font-medium italic font-serif">
                  Char
                </p>
                <p className="text-sm text-neutral-500">
                  John Jeong, Yujong Lee
                </p>
              </div>

              <div>
                <Image
                  src="/api/images/hyprnote/signature-dark.svg"
                  alt="Char Signature"
                  width={124}
                  height={60}
                  layout="constrained"
                  className="opacity-80 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlogSection() {
  const sortedArticles = [...allArticles]
    .sort((a, b) => {
      const aDate = a.date;
      const bDate = b.date;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 3);

  if (sortedArticles.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-neutral-100 py-16">
      <div className="text-center mb-12 px-4">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Latest from our blog
        </h2>
        <p className="text-neutral-600 max-w-lg mx-auto">
          Insights, updates, and stories from the Char team
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 px-4">
        {sortedArticles.map((article) => {
          const ogImage =
            article.coverImage ||
            `https://hyprnote.com/og?type=blog&title=${encodeURIComponent(article.title ?? "")}${article.author.length > 0 ? `&author=${encodeURIComponent(article.author.join(", "))}` : ""}${article.date ? `&date=${encodeURIComponent(new Date(article.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}` : ""}&v=1`;

          return (
            <Link
              key={article._meta.filePath}
              to="/blog/$slug/"
              params={{ slug: article.slug }}
              className="group block h-full"
            >
              <article className="h-full border border-neutral-100 rounded-xs overflow-hidden bg-white hover:shadow-lg transition-all duration-300 flex flex-col">
                <div className="aspect-40/21 overflow-hidden border-b border-neutral-100 bg-stone-50">
                  <img
                    src={ogImage}
                    alt={article.display_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-serif text-stone-600 mb-2 group-hover:text-stone-800 transition-colors line-clamp-2">
                    {article.display_title || article.meta_title}
                  </h3>

                  <p className="text-sm text-neutral-600 leading-relaxed mb-4 line-clamp-3 flex-1">
                    {article.meta_description}
                  </p>

                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
                    <time
                      dateTime={article.date}
                      className="text-xs text-neutral-500"
                    >
                      {new Date(article.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>

                    <span className="text-xs text-neutral-500 group-hover:text-stone-600 transition-colors font-medium">
                      Read →
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          to="/blog/"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
        >
          View all articles
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}

export function CTASection({
  heroInputRef,
}: {
  heroInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const platform = usePlatform();
  const platformCTA = getPlatformCTA(platform);

  const getButtonLabel = () => {
    if (platform === "mobile") {
      return "Get reminder";
    }
    return platformCTA.label;
  };

  const handleCTAClick = () => {
    if (platformCTA.action === "waitlist") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        if (heroInputRef.current) {
          heroInputRef.current.focus();
          heroInputRef.current.parentElement?.classList.add(
            "animate-shake",
            "border-stone-600",
          );
          setTimeout(() => {
            heroInputRef.current?.parentElement?.classList.remove(
              "animate-shake",
              "border-stone-600",
            );
          }, 500);
        }
      }, 500);
    }
  };

  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Char"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Your meetings. Your data.
          <br className="sm:hidden" /> Your control.
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Start taking meeting notes with AI—without the lock-in
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {platformCTA.action === "download" ? (
            <DownloadButton />
          ) : (
            <button
              onClick={handleCTAClick}
              className={cn([
                "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
                "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                "transition-all",
              ])}
            >
              {getButtonLabel()}
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
            </button>
          )}
          <div className="hidden sm:block">
            <GithubStars />
          </div>
        </div>
      </div>
    </section>
  );
}
