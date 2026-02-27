import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/mini-apps")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Mini Apps - Char" },
      {
        name: "description",
        content:
          "Built-in mini apps for contacts, calendar, daily notes, and noteshelf. Everything you need to stay organized alongside your meetings.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <ContactsSection />
        <SlashSeparator />
        <CalendarSection />
        <SlashSeparator />
        <DailyNotesSection />
        <SlashSeparator />
        <FoldersSection />
        <SlashSeparator />
        <AdvancedSearchSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="mb-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700 mb-6">
          Everything in one place
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Built-in mini apps for contacts, calendar, daily notes, and your
          personal knowledge base.
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

function ContactsSection() {
  const [currentImage, setCurrentImage] = useState(0);

  const images = [
    "/api/images/hyprnote/mini-apps/contacts-human.jpg",
    "/api/images/hyprnote/mini-apps/contacts-org.jpg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section id="contacts" className="bg-stone-50/30">
      <div>
        <div className="text-center">
          <div className="py-12 px-6">
            <h2 className="text-3xl font-serif text-stone-700 mb-4">
              Contacts
            </h2>
            <p className="text-base text-neutral-600 max-w-2xl mx-auto">
              A relationship-focused CRM that builds itself from your meetings.
              Import contacts and watch them come alive with context once you
              actually meet.
            </p>
          </div>

          <div className="relative w-full overflow-hidden">
            {images.map((image, index) => (
              <img
                key={image}
                src={image}
                alt="Contacts interface"
                className={cn([
                  "w-full h-auto object-cover transition-opacity duration-1000",
                  index === currentImage
                    ? "opacity-100"
                    : "opacity-0 absolute inset-0",
                ])}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarSection() {
  return (
    <section id="calendar" className="bg-stone-50/30">
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-700">Calendar</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Connect your calendar for intelligent meeting preparation and
              automatic note organization.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Automatic meeting linking
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Pre-meeting context and preparation
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Timeline view with notes
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-8 bg-stone-50 overflow-hidden">
          <div className="max-w-lg w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <Icon
                icon="mdi:calendar"
                className="text-2xl text-stone-700 shrink-0 mt-1"
              />
              <div className="flex-1">
                <h4 className="text-lg font-serif text-stone-700 mb-1">
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
                <h5 className="text-sm font-medium text-stone-700 mb-2">
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

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-700 mb-3">Calendar</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Connect your calendar for intelligent meeting preparation and
            automatic note organization.
          </p>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Automatic meeting linking
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Pre-meeting context and preparation
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Timeline view with notes
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50 overflow-clip">
          <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <Icon
                icon="mdi:calendar"
                className="text-2xl text-stone-700 shrink-0 mt-1"
              />
              <div className="flex-1">
                <h4 className="text-lg font-serif text-stone-700 mb-1">
                  Weekly Team Sync
                </h4>
                <p className="text-sm text-neutral-600">
                  Today at 10:00 AM · 30 minutes
                </p>
              </div>
              <button className="px-3 py-1 text-xs bg-stone-600 text-white rounded-full shrink-0">
                Start Recording
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <h5 className="text-sm font-medium text-stone-700 mb-2">
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
    </section>
  );
}

function DailyNotesSection() {
  return (
    <section id="daily-notes" className="bg-stone-50/30">
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-700">Daily Notes</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Consolidate all your meetings, action items, and insights in one
              place.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Automatic aggregation of meetings
                </span>
                <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-full">
                  Coming soon
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Chronological timeline view
                </span>
                <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-full">
                  Coming soon
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  AI-generated daily summary
                </span>
                <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-full">
                  Coming soon
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-8 bg-stone-50 overflow-hidden">
          <div className="max-w-lg w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <p className="text-neutral-600 text-center italic">Coming soon</p>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-700 mb-3">
            Daily Notes
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Consolidate all your meetings, action items, and insights in one
            place.
          </p>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Automatic aggregation of meetings
              </span>
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-full shrink-0">
                Coming soon
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Chronological timeline view
              </span>
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-full shrink-0">
                Coming soon
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                AI-generated daily summary
              </span>
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-full shrink-0">
                Coming soon
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50 overflow-clip">
          <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <p className="text-neutral-600 text-center italic">Coming soon</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FoldersSection() {
  return (
    <section id="folders" className="bg-stone-50/30">
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-700">Folders</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Organize your meetings and notes into folders for easy access and
              better structure.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Group related meetings together
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Organize by project, client, or topic
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
                <span className="text-neutral-600">
                  Quick navigation and filtering
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="bg-stone-50 overflow-hidden aspect-4/3">
          <img
            src="/api/images/hyprnote/mini-apps/folders.jpg"
            alt="Folders interface"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-700 mb-3">Folders</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Organize your meetings and notes into folders for easy access and
            better structure.
          </p>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Group related meetings together
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Organize by project, client, or topic
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="text-green-600 shrink-0 mt-0.5 size-5" />
              <span className="text-neutral-600 text-sm">
                Quick navigation and filtering
              </span>
            </li>
          </ul>
        </div>
        <div className="bg-stone-50 overflow-hidden aspect-4/3">
          <img
            src="/api/images/hyprnote/mini-apps/folders.jpg"
            alt="Folders interface"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

const ADVANCED_SEARCH_AUTO_ADVANCE_DURATION = 5000;

const advancedSearchImages = [
  {
    id: 1,
    url: "/api/images/hyprnote/mini-apps/search-default.jpg",
    title: "Suggestions",
    description:
      "Get instant search result suggestions based on recent activities",
  },
  {
    id: 2,
    url: "/api/images/hyprnote/mini-apps/search-semantic.jpg",
    title: "Semantic search",
    description: "Find relevant info even without exact keywords",
  },
  {
    id: 3,
    url: "/api/images/hyprnote/mini-apps/search-filter.jpg",
    title: "Filters",
    description: "Filter out result types easily",
  },
];

function AdvancedSearchSection() {
  const [selectedImage, setSelectedImage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef(0);

  useEffect(() => {
    if (isPaused) return;

    const startTime =
      Date.now() -
      (progressRef.current / 100) * ADVANCED_SEARCH_AUTO_ADVANCE_DURATION;
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(
        (elapsed / ADVANCED_SEARCH_AUTO_ADVANCE_DURATION) * 100,
        100,
      );
      setProgress(newProgress);
      progressRef.current = newProgress;

      if (newProgress >= 100) {
        const currentIndex = advancedSearchImages.findIndex(
          (img) => img.id === selectedImage,
        );
        const nextIndex = (currentIndex + 1) % advancedSearchImages.length;
        setSelectedImage(advancedSearchImages[nextIndex].id);
        setProgress(0);
        progressRef.current = 0;
      } else {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [selectedImage, isPaused]);

  const handleTabClick = (imageId: number) => {
    setSelectedImage(imageId);
    setProgress(0);
    progressRef.current = 0;
  };

  return (
    <section id="advanced-search" className="bg-stone-50/30">
      <div>
        <div className="text-center">
          <div className="py-12 px-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium mb-4">
              Coming Soon
            </div>
            <h2 className="text-3xl font-serif text-stone-700 mb-4">
              Advanced Search
            </h2>
            <p className="text-base text-neutral-600">
              Complex queries with boolean operators and custom filters
            </p>
          </div>

          <div className="grid md:grid-cols-3 border-y border-neutral-100">
            {advancedSearchImages.map((image, index) => (
              <button
                key={image.id}
                className={cn([
                  "text-center cursor-pointer transition-colors relative overflow-hidden",
                  index < advancedSearchImages.length - 1 &&
                    "border-r border-neutral-100",
                ])}
                onClick={() => handleTabClick(image.id)}
                onMouseEnter={() =>
                  selectedImage === image.id && setIsPaused(true)
                }
                onMouseLeave={() =>
                  selectedImage === image.id && setIsPaused(false)
                }
              >
                {selectedImage === image.id && (
                  <div
                    className="absolute inset-0 bg-stone-100 transition-none"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <div className="p-6 relative">
                  <h3 className="text-lg font-serif text-stone-700 mb-2">
                    {image.title}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {image.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <img
            src={
              advancedSearchImages.find((img) => img.id === selectedImage)?.url
            }
            alt="Advanced search interface"
            className="w-full h-auto object-cover"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          />
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
          Get the complete experience
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Download Char to start using contacts, calendar, and folders today.
          Daily notes coming soon
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
        </div>
      </div>
    </section>
  );
}
