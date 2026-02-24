import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Typewriter } from "@hypr/ui/components/ui/typewriter";
import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { MockWindow } from "@/components/mock-window";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/ai-notetaking")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Notetaking - Hyprnote" },
      {
        name: "description",
        content:
          "Complete AI-powered notetaking solution. Record meetings, transcribe audio, and get intelligent summaries with customizable templates. Works with any video conferencing tool.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "AI Notetaking - Hyprnote" },
      {
        property: "og:description",
        content:
          "Record meetings in real-time or upload audio files. Get instant AI transcriptions, summaries, and action items with customizable templates.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/product/ai-notetaking",
      },
    ],
  }),
});

const tabs = [
  {
    title: "Compact Mode",
    description:
      "The default collapsed overlay that indicates the meeting is being listened to. Minimal and unobtrusive, staying out of your way.",
    image: "/api/images/hyprnote/float-compact.jpg",
  },
  {
    title: "Memos",
    description:
      "Take quick notes during the meeting. Jot down important points, ideas, or reminders without losing focus on the conversation.",
    image: "/api/images/hyprnote/float-memos.jpg",
  },
  {
    title: "Transcript",
    description:
      "Watch the live transcript as the conversation unfolds in real-time, so you never miss what was said during the meeting.",
    image: "/api/images/hyprnote/float-transcript.jpg",
  },
  {
    title: "Live Insights",
    description:
      "Get a rolling summary of the past 5 minutes with AI-powered suggestions. For sales calls, receive prompts for qualification questions and next steps.",
    image: "/api/images/hyprnote/float-insights.jpg",
  },
  {
    title: "Chat",
    description:
      "Ask questions and get instant answers during the meeting. Query the transcript, get clarifications, or find specific information on the fly.",
    image: "/api/images/hyprnote/float-chat.jpg",
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
        <SlashSeparator />
        <EditorSection />
        <SlashSeparator />
        <TranscriptionSection />
        <SlashSeparator />
        <SummariesSection />
        <SlashSeparator />
        <SearchSection />
        <SlashSeparator />
        <SharingSection />
        <SlashSeparator />
        <FloatingPanelSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-12 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Never Miss a Detail From Your Meetings
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Hyprnote captures everything said, combines it with your notes,
            <br className="hidden sm:inline" /> and creates a perfect summary.
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
      <div className="relative aspect-video w-full border-t border-neutral-100 overflow-hidden">
        <img
          src="/api/images/hyprnote/ai-notetaking-hero.jpg"
          alt="AI notetaking in action"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

function EditorSection() {
  return (
    <section id="editor" className="bg-stone-50/30">
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-600">
              Simple, Familiar Notepad
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Hyprnote comes with a easy-to-use text editor where you can jot
              down stuff in markdown.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Full markdown syntax support for quick formatting
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Clean, distraction-free writing experience
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Rich text editing with familiar keyboard shortcuts
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-end justify-center px-8 pb-0 pt-8 bg-stone-50/30 overflow-hidden">
          <MockWindow>
            <div className="p-6 h-80 overflow-hidden">
              <AnimatedMarkdownDemo />
            </div>
          </MockWindow>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-600 mb-3">
            Simple, Familiar Notepad
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Hyprnote comes with a easy-to-use text editor where you can jot down
            stuff in markdown.
          </p>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Full markdown syntax support for quick formatting
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Clean, distraction-free writing experience
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Rich text editing with familiar keyboard shortcuts
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
          <MockWindow variant="mobile">
            <div className="p-6 h-[200px] overflow-hidden">
              <AnimatedMarkdownDemo isMobile />
            </div>
          </MockWindow>
        </div>
      </div>
    </section>
  );
}

function AudioTranscriptionDemo() {
  const [progress, setProgress] = useState(0);

  const words = [
    { position: 0.02, text: "Welcome" },
    { position: 0.15, text: "to" },
    { position: 0.2, text: "today's" },
    { position: 0.33, text: "meeting" },
    { position: 0.48, text: "Let's" },
    { position: 0.59, text: "discuss" },
    { position: 0.73, text: "the" },
    { position: 0.79, text: "Q4" },
    { position: 0.86, text: "roadmap" },
  ];

  const audioBarHeights = useState(() => {
    const audioBarCount = 60;
    return Array.from({ length: audioBarCount }, () => {
      return Math.random() * 0.8 + 0.2;
    });
  })[0];

  useEffect(() => {
    const duration = 8000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed % duration) / duration;

      setProgress(newProgress);

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      className="relative w-full bg-white flex flex-col items-center justify-center p-8 gap-6"
      style={{ aspectRatio: "52/39" }}
    >
      <div className="w-full flex items-center justify-center gap-1 flex-1">
        {audioBarHeights.map((height, i) => {
          const isTranscribed = i / audioBarHeights.length <= progress;
          return (
            <div
              key={i}
              className="flex-1 transition-colors duration-300 rounded-full"
              style={{
                height: `${height * 100}%`,
                backgroundColor: isTranscribed ? "#ef4444" : "#f5f5f4",
                minWidth: "6px",
              }}
            />
          );
        })}
      </div>

      <div className="w-full px-4 relative h-8 flex items-center">
        {words.map((word, i) => {
          const isVisible = progress >= word.position;
          return (
            <span
              key={i}
              className="absolute text-neutral-600 text-xs sm:text-sm transition-opacity duration-300"
              style={{
                left: `${word.position * 100}%`,
                opacity: isVisible ? 1 : 0,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedMarkdownDemo({ isMobile = false }: { isMobile?: boolean }) {
  const [completedLines, setCompletedLines] = useState<React.ReactElement[]>(
    [],
  );
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isTransformed, setIsTransformed] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const lines = [
    {
      text: "# Meeting Notes",
      type: "heading" as const,
      placeholder: "Enter header",
    },
    {
      text: "- Product roadmap review",
      type: "bullet" as const,
      placeholder: "Enter list item",
    },
    {
      text: "- Q4 marketing strategy",
      type: "bullet" as const,
      placeholder: "Enter list item",
    },
    {
      text: "- Budget allocation",
      type: "bullet" as const,
      placeholder: "Enter list item",
    },
    {
      text: "**Decision:** Launch campaign by end of month",
      type: "bold" as const,
      placeholder: "",
    },
  ];

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      const timeout = setTimeout(() => {
        setCompletedLines([]);
        setCurrentLineIndex(0);
        setTypingText("");
        setIsTransformed(false);
        setShowPlaceholder(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    const currentLine = lines[currentLineIndex];
    let charIndex = 0;
    let timeout: NodeJS.Timeout;

    const typeCharacter = () => {
      if (charIndex < currentLine.text.length) {
        const newText = currentLine.text.slice(0, charIndex + 1);
        setTypingText(newText);
        charIndex++;

        // Check if we just typed the trigger sequence (e.g., "# " or "- ")
        const isMarkdownTrigger =
          (currentLine.type === "heading" && newText === "# ") ||
          (currentLine.type === "bullet" && newText === "- ");

        if (isMarkdownTrigger && !isTransformed) {
          // Show placeholder briefly, then transform
          setShowPlaceholder(true);

          timeout = setTimeout(() => {
            setIsTransformed(true);
            setShowPlaceholder(false);
            timeout = setTimeout(typeCharacter, 60);
          }, 300); // Show placeholder duration
        } else if (
          currentLine.type === "bold" &&
          newText.match(/\*\*[^*]+\*\*/)
        ) {
          setIsTransformed(true);
          timeout = setTimeout(typeCharacter, 60);
        } else {
          timeout = setTimeout(typeCharacter, 60);
        }
      } else {
        timeout = setTimeout(() => {
          const completedElement = renderCompletedLine(currentLine, isMobile);
          if (completedElement) {
            setCompletedLines((prev) => [...prev, completedElement]);
          }

          setTypingText("");
          setIsTransformed(false);
          setShowPlaceholder(false);
          setCurrentLineIndex((prev) => prev + 1);
        }, 800);
      }
    };

    typeCharacter();

    return () => clearTimeout(timeout);
  }, [currentLineIndex, isMobile]);

  const renderCompletedLine = (
    line: (typeof lines)[number],
    mobile: boolean,
  ) => {
    const key = `completed-${currentLineIndex}`;

    if (line.type === "heading") {
      const text = line.text.replace("# ", "");
      return (
        <h1
          key={key}
          className={cn([
            "font-bold text-stone-700",
            mobile ? "text-xl" : "text-2xl",
          ])}
        >
          {text}
        </h1>
      );
    }

    if (line.type === "bullet") {
      const text = line.text.replace("- ", "");
      return (
        <ul
          key={key}
          className={cn([
            "list-disc pl-5 text-neutral-700",
            mobile ? "text-sm" : "text-base",
          ])}
        >
          <li>{text}</li>
        </ul>
      );
    }

    if (line.type === "bold") {
      const parts = line.text.split(/(\*\*.*?\*\*)/g);
      return (
        <p
          key={key}
          className={cn(["text-neutral-700", mobile ? "text-sm" : "text-base"])}
        >
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <span key={i} className="font-bold">
                  {part.slice(2, -2)}
                </span>
              );
            }
            return part;
          })}
        </p>
      );
    }

    return null;
  };

  const renderCurrentLine = () => {
    const currentLine = lines[currentLineIndex];

    if (!currentLine) {
      return null;
    }

    // Show placeholder state (after typing "# " or "- " but before transformation)
    if (showPlaceholder && !isTransformed) {
      // For headings, show with larger font size
      if (currentLine.type === "heading") {
        return (
          <h1 className={cn(["font-bold", isMobile ? "text-xl" : "text-2xl"])}>
            <span className="animate-pulse">|</span>
            <span className="text-neutral-400">{currentLine.placeholder}</span>
          </h1>
        );
      }

      // For bullets, show as list item
      if (currentLine.type === "bullet") {
        return (
          <ul
            className={cn([
              "list-disc pl-5",
              isMobile ? "text-sm" : "text-base",
            ])}
          >
            <li>
              <span className="animate-pulse">|</span>
              <span className="text-neutral-400">
                {currentLine.placeholder}
              </span>
            </li>
          </ul>
        );
      }

      // Default fallback (shouldn't reach here for current lines)
      return (
        <div
          className={cn([
            "text-neutral-700",
            isMobile ? "text-sm" : "text-base",
          ])}
        >
          <span className="animate-pulse">|</span>
          <span className="text-neutral-400">{currentLine.placeholder}</span>
        </div>
      );
    }

    // Transformed state for headings
    if (currentLine.type === "heading" && isTransformed) {
      const displayText = typingText.slice(2); // Remove "# "
      return (
        <h1
          className={cn([
            "font-bold text-stone-700",
            isMobile ? "text-xl" : "text-2xl",
          ])}
        >
          {displayText}
          <span className="animate-pulse">|</span>
        </h1>
      );
    }

    // Transformed state for bullets
    if (currentLine.type === "bullet" && isTransformed) {
      const displayText = typingText.slice(2); // Remove "- "
      return (
        <ul
          className={cn([
            "list-disc pl-5 text-neutral-700",
            isMobile ? "text-sm" : "text-base",
          ])}
        >
          <li>
            {displayText}
            <span className="animate-pulse">|</span>
          </li>
        </ul>
      );
    }

    // Transformed state for bold text
    if (currentLine.type === "bold" && isTransformed) {
      const parts = typingText.split(/(\*\*.*?\*\*)/g);
      return (
        <p
          className={cn([
            "text-neutral-700",
            isMobile ? "text-sm" : "text-base",
          ])}
        >
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <span key={i} className="font-bold">
                  {part.slice(2, -2)}
                </span>
              );
            }
            return part;
          })}
          <span className="animate-pulse">|</span>
        </p>
      );
    }

    // Default typing state
    return (
      <div
        className={cn(["text-neutral-700", isMobile ? "text-sm" : "text-base"])}
      >
        {typingText}
        <span className="animate-pulse">|</span>
      </div>
    );
  };

  return (
    <div className={cn(["flex flex-col gap-3", isMobile && "gap-2"])}>
      {completedLines}
      {currentLineIndex < lines.length && renderCurrentLine()}
    </div>
  );
}

function TranscriptionSection() {
  return (
    <section id="transcription" className="border-y border-neutral-100">
      <div className="text-center py-12 px-4 lg:px-0">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Live meetings to recorded audio, Hyprnote transcribes it all
        </h2>
      </div>

      <div className="border-t border-neutral-100">
        <div className="hidden sm:grid sm:grid-cols-2">
          <div className="border-r border-neutral-100 flex flex-col">
            <div className="p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Icon
                  icon="mdi:microphone"
                  className="text-3xl text-stone-600"
                />
                <h3 className="text-2xl font-serif text-stone-600">
                  Real-time transcription
                </h3>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                Every word captured as it's spoken. See the transcript build in
                real-time with speaker identification and timestamps.
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src="/api/images/hyprnote/no-wifi.png"
                alt="On-device transcription"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:upload" className="text-3xl text-stone-600" />
                <h3 className="text-2xl font-serif text-stone-600">
                  Upload files
                </h3>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                Upload audio files (M4A, MP3, WAV) or existing transcripts (VTT,
                TXT) to get AI summaries and insights.
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-neutral-100">
              <AudioTranscriptionDemo />
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="border-b border-neutral-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Icon
                  icon="mdi:microphone"
                  className="text-2xl text-stone-600"
                />
                <h3 className="text-xl font-serif text-stone-600">
                  Real-time transcription
                </h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                Every word captured as it's spoken. See the transcript build in
                real-time with speaker identification and timestamps.
              </p>
            </div>
          </div>
          <div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Icon icon="mdi:upload" className="text-2xl text-stone-600" />
                <h3 className="text-xl font-serif text-stone-600">
                  Upload files
                </h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                Upload audio files (M4A, MP3, WAV) or existing transcripts (VTT,
                TXT) to get AI summaries and insights.
              </p>
            </div>
            <div className="overflow-hidden bg-neutral-100">
              <AudioTranscriptionDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummariesSection() {
  const [typedText1, setTypedText1] = useState("");
  const [typedText2, setTypedText2] = useState("");
  const [enhancedLines, setEnhancedLines] = useState(0);

  const text1 = "metrisc w/ john";
  const text2 = "stakehlder mtg";

  useEffect(() => {
    const runAnimation = () => {
      setTypedText1("");
      setTypedText2("");
      setEnhancedLines(0);

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
                              setTimeout(() => runAnimation(), 1000);
                            }, 800);
                          }, 800);
                        }, 800);
                      }, 800);
                    }, 800);
                  }, 800);
                }, 500);
              }
            }, 50);
          }
        }, 50);
      }, 500);
    };

    runAnimation();
  }, []);

  return (
    <section id="summaries">
      <div className="text-center py-12 px-4 lg:px-0">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Your Notes+AI = Perfect Summary
        </h2>
      </div>
      <div className="border-t border-neutral-100">
        <div className="hidden sm:grid sm:grid-cols-2">
          <div className="border-r border-neutral-100 flex flex-col overflow-clip">
            <div className="p-8 flex flex-col gap-4">
              <p className="text-lg font-serif text-neutral-600 leading-relaxed">
                <span className="font-semibold">While you take notes,</span>{" "}
                Hyprnote listens and keeps track of everything that happens
                during the meeting.
              </p>
            </div>
            <div className="flex-1 flex items-end justify-center px-8 pb-0 bg-stone-50/30">
              <MockWindow showAudioIndicator={enhancedLines === 0}>
                <div className="p-6 h-[300px] overflow-hidden">
                  <div className="text-neutral-700">ui update - mobile</div>
                  <div className="text-neutral-700">api</div>
                  <div className="text-neutral-700 mt-4">new dash - urgent</div>
                  <div className="text-neutral-700">a/b test next wk</div>
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
              </MockWindow>
            </div>
          </div>

          <div className="flex flex-col overflow-clip">
            <div className="p-8 flex flex-col gap-4">
              <p className="text-lg font-serif text-neutral-600 leading-relaxed">
                <span className="font-semibold">
                  After the meeting is over,
                </span>{" "}
                Hyprnote combines your notes with transcripts to create a
                summary.
              </p>
            </div>
            <div className="flex-1 flex items-end justify-center px-8 pb-0 bg-stone-50/30">
              <MockWindow>
                <div className="p-6 flex flex-col gap-4 h-[300px] overflow-hidden">
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
                        Sarah presented the new mobile UI update, which includes
                        a streamlined navigation bar and improved button
                        placements for better accessibility.
                      </li>
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 3 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        Ben confirmed that API adjustments are needed to support
                        dynamic UI changes, particularly for fetching
                        personalized user data more efficiently.
                      </li>
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        The UI update will be implemented in phases, starting
                        with core navigation improvements. Ben will ensure API
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
                        Alice emphasized that the new analytics dashboard must
                        be prioritized due to increasing stakeholder demand.
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
              </MockWindow>
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="border-b border-neutral-100">
            <div className="p-6 pb-2">
              <p className="text-base font-serif text-neutral-600 leading-relaxed mb-4">
                <span className="font-semibold">While you take notes,</span>{" "}
                Hyprnote listens and keeps track of everything that happens
                during the meeting.
              </p>
            </div>
            <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
              <MockWindow variant="mobile">
                <div className="p-6 h-[200px] overflow-hidden">
                  <div className="text-neutral-700">ui update - mobile</div>
                  <div className="text-neutral-700">api</div>
                  <div className="text-neutral-700 mt-3">new dash - urgent</div>
                  <div className="text-neutral-700">a/b test next wk</div>
                  <div className="text-neutral-700 mt-3">
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
              </MockWindow>
            </div>
          </div>

          <div>
            <div className="p-6 pb-2">
              <p className="text-base font-serif text-neutral-600 leading-relaxed mb-4">
                <span className="font-semibold">
                  After the meeting is over,
                </span>{" "}
                Hyprnote combines your notes with transcripts to create a
                summary.
              </p>
            </div>
            <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
              <MockWindow variant="mobile">
                <div className="p-6 flex flex-col gap-4 h-[200px] overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-lg font-semibold text-stone-700">
                      Mobile UI Update and API Adjustments
                    </h4>
                    <ul className="flex flex-col gap-2 text-neutral-700 list-disc pl-4">
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 1 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        Sarah presented the new mobile UI update, which includes
                        a streamlined navigation bar and improved button
                        placements for better accessibility.
                      </li>
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 2 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        Ben confirmed that API adjustments are needed to support
                        dynamic UI changes, particularly for fetching
                        personalized user data more efficiently.
                      </li>
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 3 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        The UI update will be implemented in phases, starting
                        with core navigation improvements. Ben will ensure API
                        modifications are completed before development begins.
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-lg font-semibold text-stone-700">
                      New Dashboard – Urgent Priority
                    </h4>
                    <ul className="flex flex-col gap-2 text-neutral-700 list-disc pl-4">
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        Alice emphasized that the new analytics dashboard must
                        be prioritized due to increasing stakeholder demand.
                      </li>
                      <li
                        className={cn([
                          "transition-opacity duration-500",
                          enhancedLines >= 5 ? "opacity-100" : "opacity-0",
                        ])}
                      >
                        The new dashboard will feature real-time user engagement
                        metrics and a customizable reporting system.
                      </li>
                    </ul>
                  </div>
                </div>
              </MockWindow>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchSection() {
  const searchQueries = [
    "Q3 marketing strategy discussion",
    "client feedback on product demo",
    "budget planning for next quarter",
    "project timeline with Sarah",
    "brainstorming session notes",
  ];

  return (
    <section
      id="search"
      className="bg-stone-50/30 bg-cover bg-center"
      style={{
        backgroundImage: "url(/api/images/texture/bg-stars.jpg)",
      }}
    >
      <div className="py-20 px-6">
        <div className="text-center flex flex-col gap-12">
          <div>
            <h2 className="text-3xl font-serif text-stone-50 mb-4">
              Find anything instantly
            </h2>
            <p className="text-base text-neutral-100">
              Search across all your notes by participant names, topics,
              keywords, or time—and jump straight to what matters
            </p>
          </div>

          <div className="relative max-w-2xl mx-auto flex flex-col gap-3">
            <div className="flex items-center gap-3 px-4 py-3 border border-stone-300 rounded-full bg-white shadow-[0_4px_6px_-1px_rgba(255,255,255,0.3),0_2px_4px_-2px_rgba(255,255,255,0.3)]">
              <SearchIcon className="text-stone-400 shrink-0 size-5" />
              <div className="flex-1 text-left min-w-0 overflow-hidden">
                <Typewriter
                  text={searchQueries}
                  speed={100}
                  deleteSpeed={30}
                  waitTime={2000}
                  className="text-base sm:text-lg text-stone-600 font-light truncate block"
                  cursorClassName="ml-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const CollaboratorsCell = memo(() => {
  const [showDavid, setShowDavid] = useState(false);
  const [davidScope, setDavidScope] = useState("Can view");
  const [showPopover, setShowPopover] = useState(false);

  const baseCollaborators = [
    {
      name: "Alex Johnson",
      avatar: "/api/images/mock/alex-johnson.png",
      scope: "Can view",
    },
    {
      name: "Jessica Lee",
      avatar: "/api/images/mock/jessica-lee.png",
      scope: "Can edit",
    },
    {
      name: "Sarah Chen",
      avatar: "/api/images/mock/sarah-chen.png",
      scope: "Can edit",
    },
    {
      name: "Michael Park",
      avatar: "/api/images/mock/michael-park.png",
      scope: "Can view",
    },
    {
      name: "Emily Rodriguez",
      avatar: "/api/images/mock/emily-rodriguez.png",
      scope: "Can edit",
    },
  ];

  const davidKim = {
    name: "David Kim",
    avatar: "/api/images/mock/david-kim.png",
    scope: davidScope,
  };

  const collaborators = showDavid
    ? [...baseCollaborators, davidKim]
    : baseCollaborators;

  useEffect(() => {
    const runAnimation = () => {
      setShowDavid(false);
      setShowPopover(false);
      setDavidScope("Can view");

      const timer1 = setTimeout(() => setShowDavid(true), 2000);
      const timer2 = setTimeout(() => setShowPopover(true), 4000);
      const timer3 = setTimeout(() => {
        setDavidScope("Can comment");
        setShowPopover(false);
      }, 5000);
      const timer4 = setTimeout(() => runAnimation(), 8000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    };

    const cleanup = runAnimation();
    return cleanup;
  }, []);

  return (
    <>
      <div className="overflow-hidden p-4 sm:aspect-4/3 h-[300px] sm:h-auto">
        <div className="h-full flex items-end">
          <div className="w-full flex flex-col gap-2">
            <AnimatePresence>
              {collaborators.map((person) => (
                <motion.div
                  key={person.name}
                  initial={
                    person.name === "David Kim"
                      ? { opacity: 0, x: -100 }
                      : false
                  }
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                  className="flex items-center gap-3 bg-linear-to-br from-stone-50/80 to-white/80 backdrop-blur-xs rounded-lg p-3 border border-stone-200/50"
                >
                  <Image
                    src={person.avatar}
                    alt={person.name}
                    width={32}
                    height={32}
                    className="rounded-full shrink-0"
                    objectFit="cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-700 truncate">
                      {person.name}
                    </div>
                  </div>
                  <motion.div
                    key={`${person.name}-${person.scope}`}
                    initial={
                      person.name === "David Kim" &&
                      davidScope === "Can comment"
                        ? { scale: 1.1 }
                        : false
                    }
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0 w-32 relative"
                  >
                    <div className="flex items-center gap-1 text-xs text-neutral-700 bg-white border border-stone-200 px-2 py-1 rounded">
                      <span className="flex-1 truncate">{person.scope}</span>
                      <ChevronDownIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    </div>
                    <AnimatePresence>
                      {person.name === "David Kim" && showPopover && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 10,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: 10,
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                          className="absolute bottom-full mb-1 left-0 w-32 bg-white border border-stone-200 rounded shadow-lg z-20 overflow-hidden"
                        >
                          <div
                            className={cn([
                              "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                              davidScope === "Can view" && "bg-stone-50",
                            ])}
                          >
                            <CheckIcon
                              className={cn([
                                "w-4 h-4",
                                davidScope === "Can view"
                                  ? "text-green-600"
                                  : "text-transparent",
                              ])}
                            />
                            <span>Can view</span>
                          </div>
                          <div
                            className={cn([
                              "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                              davidScope === "Can comment" && "bg-stone-50",
                            ])}
                          >
                            <CheckIcon
                              className={cn([
                                "w-4 h-4",
                                davidScope === "Can comment"
                                  ? "text-green-600"
                                  : "text-transparent",
                              ])}
                            />
                            <span>Can comment</span>
                          </div>
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                            <CheckIcon className="w-4 h-4 text-transparent" />
                            <span>Can edit</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
});

CollaboratorsCell.displayName = "CollaboratorsCell";

const ShareLinksCell = memo(() => {
  const [linkClicked, setLinkClicked] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [linkPermission, setLinkPermission] = useState("View only");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [slackClicked, setSlackClicked] = useState(false);
  const [showSlackPopover, setShowSlackPopover] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [sendClicked, setSendClicked] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const [teamsClicked, setTeamsClicked] = useState(false);
  const [showTeamsPopover, setShowTeamsPopover] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamsSendClicked, setTeamsSendClicked] = useState(false);
  const [teamsShowSent, setTeamsShowSent] = useState(false);
  const [salesforceClicked, setSalesforceClicked] = useState(false);
  const [showSalesforcePopover, setShowSalesforcePopover] = useState(false);
  const [selectedLead, setSelectedLead] = useState("");
  const [salesforceSendClicked, setSalesforceSendClicked] = useState(false);
  const [salesforceShowSent, setSalesforceShowSent] = useState(false);

  useEffect(() => {
    const runAnimation = () => {
      setLinkClicked(false);
      setShowCopied(false);
      setLinkPermission("View only");
      setShowLinkPopover(false);
      setSlackClicked(false);
      setShowSlackPopover(false);
      setSelectedChannel("");
      setSendClicked(false);
      setShowSent(false);
      setTeamsClicked(false);
      setShowTeamsPopover(false);
      setSelectedTeam("");
      setTeamsSendClicked(false);
      setTeamsShowSent(false);
      setSalesforceClicked(false);
      setShowSalesforcePopover(false);
      setSelectedLead("");
      setSalesforceSendClicked(false);
      setSalesforceShowSent(false);

      const timer1 = setTimeout(() => setShowLinkPopover(true), 2000);
      const timer2 = setTimeout(() => setLinkPermission("Editable"), 2500);
      const timer3 = setTimeout(() => setShowLinkPopover(false), 2800);
      const timer4 = setTimeout(() => setLinkClicked(true), 3300);
      const timer5 = setTimeout(() => setShowCopied(true), 3600);
      const timer6 = setTimeout(() => setSlackClicked(true), 4500);
      const timer7 = setTimeout(() => setShowSlackPopover(true), 4800);
      const timer8 = setTimeout(
        () => setSelectedChannel("#team-meeting"),
        5500,
      );
      const timer9 = setTimeout(() => setShowSlackPopover(false), 5800);
      const timer10 = setTimeout(() => setSendClicked(true), 6100);
      const timer11 = setTimeout(() => setShowSent(true), 6400);
      const timer12 = setTimeout(() => setTeamsClicked(true), 7000);
      const timer13 = setTimeout(() => setShowTeamsPopover(true), 7300);
      const timer14 = setTimeout(() => setSelectedTeam("Design Team"), 8000);
      const timer15 = setTimeout(() => setShowTeamsPopover(false), 8300);
      const timer16 = setTimeout(() => setTeamsSendClicked(true), 8600);
      const timer17 = setTimeout(() => setTeamsShowSent(true), 8900);
      const timer18 = setTimeout(() => setSalesforceClicked(true), 9500);
      const timer19 = setTimeout(() => setShowSalesforcePopover(true), 9800);
      const timer20 = setTimeout(() => setSelectedLead("John Smith"), 10500);
      const timer21 = setTimeout(() => setShowSalesforcePopover(false), 10800);
      const timer22 = setTimeout(() => setSalesforceSendClicked(true), 11100);
      const timer23 = setTimeout(() => setSalesforceShowSent(true), 11400);
      const timer24 = setTimeout(() => runAnimation(), 13000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
        clearTimeout(timer6);
        clearTimeout(timer7);
        clearTimeout(timer8);
        clearTimeout(timer9);
        clearTimeout(timer10);
        clearTimeout(timer11);
        clearTimeout(timer12);
        clearTimeout(timer13);
        clearTimeout(timer14);
        clearTimeout(timer15);
        clearTimeout(timer16);
        clearTimeout(timer17);
        clearTimeout(timer18);
        clearTimeout(timer19);
        clearTimeout(timer20);
        clearTimeout(timer21);
        clearTimeout(timer22);
        clearTimeout(timer23);
        clearTimeout(timer24);
      };
    };

    const cleanup = runAnimation();
    return cleanup;
  }, []);

  return (
    <div className="overflow-hidden p-4 flex items-center justify-center sm:aspect-4/3 h-[300px] sm:h-auto">
      <div className="w-full flex flex-col gap-2">
        <motion.div
          animate={linkClicked ? { scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={cn([
            "bg-linear-to-br from-purple-50/80 to-white/80 backdrop-blur-xs rounded-lg p-3 border border-stone-200/50 flex items-center justify-between gap-3 cursor-pointer overflow-visible relative",
            showLinkPopover && "z-10",
          ])}
        >
          <Icon icon="hugeicons:note" className="w-8 text-stone-600" />
          <div className="flex-1 flex items-center justify-between gap-2 relative">
            <motion.div
              key={linkPermission}
              initial={
                linkPermission !== "View only" ? { scale: 1.1 } : { scale: 1 }
              }
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 text-xs text-neutral-700 bg-white border border-stone-200 px-2 py-1 rounded relative w-32"
            >
              <span className="flex-1 truncate">{linkPermission}</span>
              <ChevronDownIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            </motion.div>
            <AnimatePresence>
              {showLinkPopover && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-1 left-0 w-32 bg-white border border-stone-200 rounded shadow-lg z-20 overflow-hidden"
                >
                  <div
                    className={cn([
                      "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                      linkPermission === "Restricted" && "bg-stone-50",
                    ])}
                  >
                    <CheckIcon
                      className={cn([
                        "w-4 h-4",
                        linkPermission === "Restricted"
                          ? "text-green-600"
                          : "text-transparent",
                      ])}
                    />
                    <span>Restricted</span>
                  </div>
                  <div
                    className={cn([
                      "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                      linkPermission === "View only" && "bg-stone-50",
                    ])}
                  >
                    <CheckIcon
                      className={cn([
                        "w-4 h-4",
                        linkPermission === "View only"
                          ? "text-green-600"
                          : "text-transparent",
                      ])}
                    />
                    <span>View only</span>
                  </div>
                  <div
                    className={cn([
                      "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                      linkPermission === "Editable" && "bg-stone-50",
                    ])}
                  >
                    <CheckIcon
                      className={cn([
                        "w-4 h-4",
                        linkPermission === "Editable"
                          ? "text-green-600"
                          : "text-transparent",
                      ])}
                    />
                    <span>Editable</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              key={showCopied ? "copied" : "copy"}
              animate={linkClicked ? { scale: [1, 0.95, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={cn([
                "w-24 px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                showCopied
                  ? "bg-linear-to-t from-stone-600 to-stone-500 text-white"
                  : "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 hover:scale-105 active:scale-95",
              ])}
            >
              {showCopied && <CheckIcon className="w-4 h-4 shrink-0" />}
              <span>{showCopied ? "Copied" : "Copy"}</span>
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          animate={slackClicked ? { scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={cn([
            "bg-linear-to-br from-green-50/80 to-white/80 backdrop-blur-xs rounded-lg p-3 border border-stone-200/50 flex items-center gap-3 cursor-pointer overflow-visible relative",
            showSlackPopover && "z-10",
          ])}
        >
          <Icon icon="logos:slack-icon" className="w-8" />
          <div className="flex-1 flex items-center justify-between gap-2 relative">
            <motion.div
              key={selectedChannel || "default"}
              initial={selectedChannel ? { scale: 1.1 } : { scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 text-xs text-neutral-700 bg-white border border-stone-200 px-2 py-1 rounded relative w-32"
            >
              <span className="flex-1 truncate">
                {selectedChannel || "Select channel"}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            </motion.div>
            <AnimatePresence>
              {showSlackPopover && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-1 left-0 w-40 bg-white border border-stone-200 rounded shadow-lg z-20 overflow-hidden"
                >
                  <div
                    className={cn([
                      "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                      selectedChannel === "#team-meeting" && "bg-stone-50",
                    ])}
                  >
                    <CheckIcon
                      className={cn([
                        "w-4 h-4",
                        selectedChannel === "#team-meeting"
                          ? "text-green-600"
                          : "text-transparent",
                      ])}
                    />
                    <span>#team-meeting</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                    <CheckIcon className="w-4 h-4 text-transparent" />
                    <span>#marketing</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                    <CheckIcon className="w-4 h-4 text-transparent" />
                    <span>#general</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              key={showSent ? "sent" : "send"}
              animate={sendClicked ? { scale: [1, 0.95, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={cn([
                "w-24 px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center justify-center",
                showSent
                  ? "bg-linear-to-t from-stone-600 to-stone-500 text-white"
                  : "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 hover:scale-105 active:scale-95",
              ])}
            >
              {showSent ? (
                <span className="flex items-center justify-center gap-1.5">
                  <CheckIcon className="w-4 h-4 shrink-0" />
                  Sent
                </span>
              ) : (
                "Send"
              )}
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          animate={teamsClicked ? { scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="bg-linear-to-br from-indigo-50/80 to-white/80 backdrop-blur-xs rounded-lg p-3 border border-stone-200/50 flex items-center gap-3 cursor-pointer overflow-visible relative"
        >
          <Icon icon="logos:microsoft-teams" className="w-8" />
          <div className="flex-1 flex items-center justify-between gap-2 relative">
            <motion.div
              key={selectedTeam || "default"}
              initial={selectedTeam ? { scale: 1.1 } : { scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 text-xs text-neutral-700 bg-white border border-stone-200 px-2 py-1 rounded relative w-32"
            >
              <span className="flex-1 truncate">
                {selectedTeam || "Select team"}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            </motion.div>
            <AnimatePresence>
              {showTeamsPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full mb-1 left-0 w-32 bg-white border border-stone-200 rounded shadow-lg z-20 overflow-hidden"
                >
                  <div
                    className={cn([
                      "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                      selectedTeam === "Design Team" && "bg-stone-50",
                    ])}
                  >
                    <CheckIcon
                      className={cn([
                        "w-4 h-4",
                        selectedTeam === "Design Team"
                          ? "text-green-600"
                          : "text-transparent",
                      ])}
                    />
                    <span>Design Team</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                    <CheckIcon className="w-4 h-4 text-transparent" />
                    <span>Engineering</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                    <CheckIcon className="w-4 h-4 text-transparent" />
                    <span>Marketing</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              key={teamsShowSent ? "sent" : "send"}
              animate={teamsSendClicked ? { scale: [1, 0.95, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={cn([
                "w-24 px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center justify-center",
                teamsShowSent
                  ? "bg-linear-to-t from-stone-600 to-stone-500 text-white"
                  : "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 hover:scale-105 active:scale-95",
              ])}
            >
              {teamsShowSent ? (
                <span className="flex items-center justify-center gap-1.5">
                  <CheckIcon className="w-4 h-4 shrink-0" />
                  Sent
                </span>
              ) : (
                "Send"
              )}
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          animate={salesforceClicked ? { scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="bg-linear-to-br from-cyan-50/80 to-white/80 backdrop-blur-xs rounded-lg p-3 border border-stone-200/50 flex items-center gap-3 cursor-pointer overflow-visible relative"
        >
          <Icon icon="logos:salesforce" className="w-8" />
          <div className="flex-1 flex items-center justify-between gap-2 relative">
            <motion.div
              key={selectedLead || "default"}
              initial={selectedLead ? { scale: 1.1 } : { scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 text-xs text-neutral-700 bg-white border border-stone-200 px-2 py-1 rounded relative w-32"
            >
              <span className="flex-1 truncate">
                {selectedLead || "Select lead"}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            </motion.div>
            <AnimatePresence>
              {showSalesforcePopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full mb-1 left-0 w-32 bg-white border border-stone-200 rounded shadow-lg z-20 overflow-hidden"
                >
                  <div
                    className={cn([
                      "flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50",
                      selectedLead === "John Smith" && "bg-stone-50",
                    ])}
                  >
                    <CheckIcon
                      className={cn([
                        "w-4 h-4",
                        selectedLead === "John Smith"
                          ? "text-green-600"
                          : "text-transparent",
                      ])}
                    />
                    <span>John Smith</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                    <CheckIcon className="w-4 h-4 text-transparent" />
                    <span>Sarah Williams</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-700 hover:bg-stone-50">
                    <CheckIcon className="w-4 h-4 text-transparent" />
                    <span>Mike Anderson</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              key={salesforceShowSent ? "synced" : "sync"}
              animate={salesforceSendClicked ? { scale: [1, 0.95, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={cn([
                "w-24 px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center justify-center",
                salesforceShowSent
                  ? "bg-linear-to-t from-stone-600 to-stone-500 text-white"
                  : "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 hover:scale-105 active:scale-95",
              ])}
            >
              {salesforceShowSent ? (
                <span className="flex items-center justify-center gap-1.5">
                  <CheckIcon className="w-4 h-4 shrink-0" />
                  Synced
                </span>
              ) : (
                "Sync"
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
});

ShareLinksCell.displayName = "ShareLinksCell";

const TrackProtectCell = memo(() => {
  const [countdown, setCountdown] = useState(3);
  const [showNote, setShowNote] = useState(true);
  const [showShatter, setShowShatter] = useState(false);

  useEffect(() => {
    const runAnimation = () => {
      setCountdown(3);
      setShowNote(true);
      setShowShatter(false);

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const shatterTimer = setTimeout(() => {
        setShowShatter(true);
        setShowNote(false);
        setTimeout(() => {
          setShowShatter(false);
          setTimeout(() => runAnimation(), 500);
        }, 800);
      }, 3000);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(shatterTimer);
      };
    };

    const cleanup = runAnimation();
    return cleanup;
  }, []);

  return (
    <div className="overflow-hidden bg-linear-to-br from-stone-50/30 to-stone-100/50 flex flex-col relative sm:aspect-4/3 h-[300px] sm:h-auto">
      <AnimatePresence>
        {countdown > 0 && showNote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            key={countdown}
            className="absolute top-2 right-2 bg-stone-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-sm z-10 border-2 border-stone-400 shadow-md"
            style={{
              background: `conic-linear(#57534e 0deg ${(4 - countdown) * 120}deg, #78716c ${(4 - countdown) * 120}deg 360deg)`,
            }}
          >
            <div className="absolute inset-1 bg-stone-600 rounded-full flex items-center justify-center">
              {countdown}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative">
        <AnimatePresence>
          {showNote && !showShatter && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="bg-white p-4 relative overflow-hidden h-full"
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-stone-300/30 text-xs font-medium whitespace-nowrap"
                    style={{
                      top: `${(i * 15) % 100}%`,
                      left: `${(i * 25) % 100}%`,
                      transform: "rotate(-45deg)",
                    }}
                  >
                    user@example.com
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 relative">
                <div className="text-sm font-semibold text-stone-700">
                  Mobile UI Update
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-5/6" />
                </div>
                <div className="text-sm font-semibold text-stone-700 mt-4">
                  Dashboard Priority
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-4/5" />
                </div>
                <div className="text-sm font-semibold text-stone-700 mt-4">
                  Next Steps
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-5/6" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showShatter && (
            <div className="absolute inset-0 bg-white overflow-hidden">
              {Array.from({ length: 144 }).map((_, i) => {
                const row = Math.floor(i / 12);
                const col = i % 12;
                const x = col * 8.33;
                const y = row * 8.33;
                const randomX = (Math.random() - 0.5) * 300;
                const randomY = Math.random() * 400 + 200;
                const randomRotate = (Math.random() - 0.5) * 180;

                return (
                  <motion.div
                    key={i}
                    initial={{
                      position: "absolute",
                      left: `${x}%`,
                      top: `${y}%`,
                      width: "8.33%",
                      height: "8.33%",
                      backgroundColor: "#fff",
                      border: "1px solid #e7e5e4",
                    }}
                    animate={{
                      x: randomX,
                      y: randomY,
                      rotate: randomRotate,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.8,
                      ease: "easeIn",
                    }}
                  />
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

TrackProtectCell.displayName = "TrackProtectCell";

function SharingSection() {
  return (
    <section id="sharing">
      <div className="text-center py-12 px-4 lg:px-0">
        <div className="inline-block px-4 py-1.5 bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs text-xs font-medium mb-4">
          Coming Soon
        </div>
        <h2 className="text-3xl font-serif text-stone-600 mb-4">Share notes</h2>
        <p className="text-base text-neutral-600">
          Collaborate seamlessly by sharing meeting notes, transcripts, and
          summaries with your team.
        </p>
      </div>
      <div className="border-t border-neutral-100">
        <div className="hidden min-[1000px]:grid min-[1000px]:grid-cols-3">
          <div className="border-r border-neutral-100 flex flex-col bg-linear-to-b from-white to-stone-50/30">
            <div className="p-4 flex flex-col gap-4 flex-1 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <Icon
                  icon="mdi:account-group"
                  className="text-3xl text-stone-600"
                />
                <h3 className="text-2xl font-serif text-stone-600">
                  Control who can access
                </h3>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                Invite selected people or teams to collaborate on notes with
                granular access controls.
              </p>
            </div>
            <CollaboratorsCell />
          </div>
          <div className="border-r border-neutral-100 flex flex-col bg-linear-to-b from-white to-stone-50/30">
            <div className="p-4 flex flex-col gap-4 flex-1 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <Icon
                  icon="mdi:link-variant"
                  className="text-3xl text-stone-600"
                />
                <h3 className="text-2xl font-serif text-stone-600">
                  Share instantly
                </h3>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                Send links or publish notes directly to Slack, Teams, or
                generate public shareable links.
              </p>
            </div>
            <ShareLinksCell />
          </div>
          <div className="flex flex-col bg-linear-to-b from-white to-stone-50/30">
            <div className="p-4 flex flex-col gap-4 flex-1 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <Icon
                  icon="mdi:shield-lock"
                  className="text-3xl text-stone-600"
                />
                <h3 className="text-2xl font-serif text-stone-600">
                  Track and protect
                </h3>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                DocSend-like features including view tracking, expiration dates,
                copy protection, and watermarks.
              </p>
            </div>
            <TrackProtectCell />
          </div>
        </div>

        <div className="hidden sm:block min-[1000px]:hidden! overflow-x-auto">
          <div className="flex min-w-max">
            <div className="w-[400px] border-r border-neutral-100 flex flex-col bg-linear-to-b from-white to-stone-50/30">
              <div className="p-4 flex flex-col gap-4 flex-1 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <Icon
                    icon="mdi:account-group"
                    className="text-3xl text-stone-600"
                  />
                  <h3 className="text-2xl font-serif text-stone-600">
                    Control who can access
                  </h3>
                </div>
                <p className="text-base text-neutral-600 leading-relaxed">
                  Invite selected people or teams to collaborate on notes with
                  granular access controls.
                </p>
              </div>
              <CollaboratorsCell />
            </div>
            <div className="w-[400px] border-r border-neutral-100 flex flex-col bg-linear-to-b from-white to-stone-50/30">
              <div className="p-4 flex flex-col gap-4 flex-1 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <Icon
                    icon="mdi:link-variant"
                    className="text-3xl text-stone-600"
                  />
                  <h3 className="text-2xl font-serif text-stone-600">
                    Share instantly
                  </h3>
                </div>
                <p className="text-base text-neutral-600 leading-relaxed">
                  Send links or publish notes directly to Slack, Teams, or
                  generate public shareable links.
                </p>
              </div>
              <ShareLinksCell />
            </div>
            <div className="w-[400px] flex flex-col bg-linear-to-b from-white to-stone-50/30">
              <div className="p-4 flex flex-col gap-4 flex-1 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <Icon
                    icon="mdi:shield-lock"
                    className="text-3xl text-stone-600"
                  />
                  <h3 className="text-2xl font-serif text-stone-600">
                    Track and protect
                  </h3>
                </div>
                <p className="text-base text-neutral-600 leading-relaxed">
                  DocSend-like features including view tracking, expiration
                  dates, copy protection, and watermarks.
                </p>
              </div>
              <TrackProtectCell />
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="border-b border-neutral-100 bg-linear-to-b from-white to-stone-50/30">
            <div className="p-4 border-b border-neutral-100">
              <div className="flex items-center gap-3 mb-3">
                <Icon
                  icon="mdi:account-group"
                  className="text-2xl text-stone-600"
                />
                <h3 className="text-xl font-serif text-stone-600">
                  Control who can access
                </h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Invite selected people or teams to collaborate on notes with
                granular access controls.
              </p>
            </div>
            <CollaboratorsCell />
          </div>
          <div className="border-b border-neutral-100 bg-linear-to-b from-white to-stone-50/30">
            <div className="p-4 border-b border-neutral-100">
              <div className="flex items-center gap-3 mb-3">
                <Icon
                  icon="mdi:link-variant"
                  className="text-2xl text-stone-600"
                />
                <h3 className="text-xl font-serif text-stone-600">
                  Share instantly
                </h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Send links or publish notes directly to Slack, Teams, or
                generate public shareable links.
              </p>
            </div>
            <ShareLinksCell />
          </div>
          <div className="bg-linear-to-b from-white to-stone-50/30">
            <div className="p-4 border-b border-neutral-100">
              <div className="flex items-center gap-3 mb-3">
                <Icon
                  icon="mdi:shield-lock"
                  className="text-2xl text-stone-600"
                />
                <h3 className="text-xl font-serif text-stone-600">
                  Track and protect
                </h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                DocSend-like features including view tracking, expiration dates,
                copy protection, and watermarks.
              </p>
            </div>
            <TrackProtectCell />
          </div>
        </div>
      </div>
    </section>
  );
}
const floatingPanelTabs = [
  {
    title: "Compact Mode",
    description:
      "Minimal overlay that indicates recording is active. Stays out of your way.",
    image: "/api/images/hyprnote/float-compact.jpg",
  },
  {
    title: "Memos",
    description:
      "Take quick notes during the meeting without losing focus on the conversation.",
    image: "/api/images/hyprnote/float-memos.jpg",
  },
  {
    title: "Transcript",
    description:
      "Watch the live transcript as the conversation unfolds in real-time.",
    image: "/api/images/hyprnote/float-transcript.jpg",
  },
  {
    title: "Live Insights",
    description:
      "Rolling summary of the past 5 minutes with AI suggestions and next steps.",
    image: "/api/images/hyprnote/float-insights.jpg",
  },
  {
    title: "Chat",
    description: "Ask questions and get instant answers during the meeting.",
    image: "/api/images/hyprnote/float-chat.jpg",
  },
];

const AUTO_ADVANCE_DURATION = 5000;

function FloatingPanelSection() {
  return (
    <section id="floating-panel" className="border-y border-neutral-100">
      <FloatingPanelHeader />
      <FloatingPanelContent />
    </section>
  );
}

function FloatingPanelHeader() {
  return (
    <div className="text-center py-12 px-4 lg:px-0">
      <div className="inline-block px-4 py-1.5 bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs text-xs font-medium mb-4">
        Coming Soon
      </div>
      <h2 className="text-3xl font-serif text-stone-600 mb-4">
        Floating panel for meetings
      </h2>
      <p className="text-base text-neutral-600 max-w-3xl mx-auto">
        A compact overlay that stays on top during meetings but won't show when
        you share your screen.
      </p>
    </div>
  );
}

function FloatingPanelContent() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const handleTabIndexChange = useCallback((nextIndex: number) => {
    setSelectedTab(nextIndex);
    setProgress(0);
    progressRef.current = 0;
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const startTime =
      Date.now() - (progressRef.current / 100) * AUTO_ADVANCE_DURATION;
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(
        (elapsed / AUTO_ADVANCE_DURATION) * 100,
        100,
      );
      setProgress(newProgress);
      progressRef.current = newProgress;

      if (newProgress >= 100) {
        const nextIndex = (selectedTab + 1) % floatingPanelTabs.length;
        setSelectedTab(nextIndex);
        setProgress(0);
        progressRef.current = 0;
        if (scrollRef.current) {
          const container = scrollRef.current;
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
  }, [selectedTab, isPaused]);

  const scrollToTab = (index: number) => {
    setSelectedTab(index);
    setProgress(0);
    progressRef.current = 0;
    if (scrollRef.current) {
      const container = scrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  const handleTabClick = (index: number) => {
    setSelectedTab(index);
    setProgress(0);
    progressRef.current = 0;
  };

  return (
    <div className="border-t border-neutral-100">
      <FloatingPanelMobile
        scrollRef={scrollRef}
        selectedTab={selectedTab}
        onIndexChange={handleTabIndexChange}
        scrollToTab={scrollToTab}
        progress={progress}
      />
      <FloatingPanelTablet
        selectedTab={selectedTab}
        progress={progress}
        onTabClick={handleTabClick}
        onPauseChange={setIsPaused}
      />
      <FloatingPanelDesktop />
    </div>
  );
}

function FloatingPanelTablet({
  selectedTab,
  progress,
  onTabClick,
  onPauseChange,
}: {
  selectedTab: number;
  progress: number;
  onTabClick: (index: number) => void;
  onPauseChange: (paused: boolean) => void;
}) {
  return (
    <div className="min-[800px]:max-[1000px]:block hidden border-t border-neutral-100">
      <div className="flex flex-col">
        <div className="overflow-x-auto scrollbar-hide border-b border-neutral-100">
          <div className="flex">
            {floatingPanelTabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => onTabClick(index)}
                onMouseEnter={() =>
                  selectedTab === index && onPauseChange(true)
                }
                onMouseLeave={() =>
                  selectedTab === index && onPauseChange(false)
                }
                className={cn([
                  "flex flex-col items-start cursor-pointer p-6 border-r border-neutral-100 last:border-r-0 min-w-[280px] text-left transition-colors relative overflow-hidden",
                  selectedTab !== index && "hover:bg-neutral-50",
                ])}
              >
                {selectedTab === index && (
                  <div
                    className="absolute inset-0 bg-stone-100 transition-none"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <div className="relative">
                  <h3 className="text-base font-serif font-medium text-stone-600 mb-1">
                    {tab.title}
                  </h3>
                  <p className="text-sm text-neutral-600">{tab.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div
          className="aspect-4/3"
          onMouseEnter={() => onPauseChange(true)}
          onMouseLeave={() => onPauseChange(false)}
        >
          <img
            src={floatingPanelTabs[selectedTab].image}
            alt={`${floatingPanelTabs[selectedTab].title} preview`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function FloatingPanelDesktop() {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef(0);

  useEffect(() => {
    if (isPaused) return;

    const startTime =
      Date.now() - (progressRef.current / 100) * AUTO_ADVANCE_DURATION;
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(
        (elapsed / AUTO_ADVANCE_DURATION) * 100,
        100,
      );
      setProgress(newProgress);
      progressRef.current = newProgress;

      if (newProgress >= 100) {
        setSelectedTab((prev) => (prev + 1) % floatingPanelTabs.length);
        setProgress(0);
        progressRef.current = 0;
      } else {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [selectedTab, isPaused]);

  const handleTabClick = (index: number) => {
    setSelectedTab(index);
    setProgress(0);
    progressRef.current = 0;
  };

  return (
    <div className="min-[1000px]:grid hidden grid-cols-2 border-t border-neutral-100">
      <div
        className="border-r border-neutral-100 relative overflow-hidden"
        style={{ paddingBottom: "56.25%" }}
      >
        <div className="absolute inset-0 overflow-y-auto">
          {floatingPanelTabs.map((tab, index) => (
            <div
              key={index}
              onClick={() => handleTabClick(index)}
              onMouseEnter={() => selectedTab === index && setIsPaused(true)}
              onMouseLeave={() => selectedTab === index && setIsPaused(false)}
              className={cn([
                "p-6 cursor-pointer transition-colors relative overflow-hidden",
                index < tabs.length - 1 && "border-b border-neutral-100",
                selectedTab !== index && "hover:bg-neutral-50",
              ])}
            >
              {selectedTab === index && (
                <div
                  className="absolute inset-0 bg-stone-100 transition-none"
                  style={{ width: `${progress}%` }}
                />
              )}
              <div className="relative">
                <h3 className="text-base font-serif font-medium text-stone-600 mb-1">
                  {tab.title}
                </h3>
                <p className="text-sm text-neutral-600">{tab.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="aspect-4/3 overflow-hidden bg-neutral-100 flex items-center justify-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <img
          src={floatingPanelTabs[selectedTab].image}
          alt={`${floatingPanelTabs[selectedTab].title} preview`}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

function FloatingPanelMobile({
  scrollRef,
  selectedTab,
  onIndexChange,
  scrollToTab,
  progress,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  selectedTab: number;
  onIndexChange: (index: number) => void;
  scrollToTab: (index: number) => void;
  progress: number;
}) {
  return (
    <div className="max-[800px]:block hidden">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollLeft = container.scrollLeft;
          const itemWidth = container.offsetWidth;
          const index = Math.round(scrollLeft / itemWidth);
          if (index !== selectedTab) {
            onIndexChange(index);
          }
        }}
      >
        <div className="flex">
          {floatingPanelTabs.map((tab, index) => (
            <div key={index} className="w-full shrink-0 snap-center">
              <div className="border-y border-neutral-100 overflow-hidden flex flex-col">
                <div className="aspect-4/3 border-b border-neutral-100 overflow-hidden">
                  <img
                    src={tab.image}
                    alt={`${tab.title} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    <span className="font-semibold text-stone-800">
                      {tab.title}
                    </span>{" "}
                    – {tab.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 py-6">
        {floatingPanelTabs.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToTab(index)}
            className={cn([
              "h-1 rounded-full cursor-pointer overflow-hidden",
              selectedTab === index
                ? "w-8 bg-neutral-300"
                : "w-8 bg-neutral-300 hover:bg-neutral-400",
            ])}
            aria-label={`Go to tab ${index + 1}`}
          >
            {selectedTab === index && (
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

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 lg:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <img
            src="/api/images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          The complete AI notetaking solution
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          From live meetings to archived recordings, handle all your audio
          transcription and AI summary needs with one powerful tool
        </p>
        <div className="pt-6">
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
        </div>
      </div>
    </section>
  );
}
