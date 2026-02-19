import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allRoadmaps } from "content-collections";
import { useRef } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { GithubStars } from "@/components/github-stars";
import { Image } from "@/components/image";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";

export const Route = createFileRoute("/_view/roadmap/")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Roadmap - Char" },
      {
        name: "description",
        content:
          "See what we're building next for Char. Our product roadmap and future plans.",
      },
    ],
  }),
});

type RoadmapStatus = "done" | "in-progress" | "todo";

type RoadmapPriority = "high" | "mid" | "low";

type RoadmapItem = {
  slug: string;
  title: string;
  status: RoadmapStatus;
  labels: string[];
  githubIssues: string[];
  mdx: string;
  priority: RoadmapPriority;
  date: string;
  description: string;
};

const priorityOrder: Record<RoadmapPriority, number> = {
  high: 1,
  mid: 2,
  low: 3,
};

const statusOrder: Record<RoadmapStatus, number> = {
  "in-progress": 1,
  todo: 2,
  done: 3,
};

function getRoadmapItems(): RoadmapItem[] {
  const items = allRoadmaps.map((item) => ({
    slug: item.slug,
    title: item.title,
    status: item.status,
    labels: item.labels || [],
    githubIssues: item.githubIssues || [],
    mdx: item.mdx,
    priority: item.priority,
    date: item.date,
    description: item.content.trim(),
  }));

  return items.sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function Component() {
  const items = getRoadmapItems();
  const heroInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Product Roadmap
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              See what we're building and what's coming next. We're always
              listening to feedback from our community.
            </p>
          </header>

          <TableView items={items} />

          <CTASection heroInputRef={heroInputRef} />
        </div>
      </div>
    </div>
  );
}

const priorityConfig: Record<
  RoadmapPriority,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className: "bg-linear-to-t from-red-200 to-red-100 text-red-900",
  },
  mid: {
    label: "Mid",
    className: "bg-linear-to-t from-orange-200 to-orange-100 text-orange-900",
  },
  low: {
    label: "Low",
    className:
      "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
  },
};

const statusConfig: Record<
  RoadmapStatus,
  { label: string; icon: string; className: string }
> = {
  "in-progress": {
    label: "In Progress",
    icon: "mdi:progress-clock",
    className: "bg-linear-to-b from-[#03BCF1] to-[#127FE5] text-white",
  },
  todo: {
    label: "To Do",
    icon: "mdi:calendar-clock",
    className:
      "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
  },
  done: {
    label: "Done",
    icon: "mdi:check-circle",
    className: "bg-linear-to-t from-green-200 to-green-100 text-green-900",
  },
};

function TableView({ items }: { items: RoadmapItem[] }) {
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-neutral-50">
            <th className="text-left py-2 px-3 text-sm font-medium text-stone-500 border-y border-neutral-100 whitespace-nowrap">
              Name
            </th>
            <th className="text-left py-2 px-3 text-sm font-medium text-stone-500 border-y border-l border-neutral-100 whitespace-nowrap">
              Status
            </th>
            <th className="text-left py-2 px-3 text-sm font-medium text-stone-500 border-y border-l border-neutral-100 whitespace-nowrap">
              Priority
            </th>
            <th className="text-left py-2 px-3 text-sm font-medium text-stone-500 border-y border-l border-neutral-100 whitespace-nowrap">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const priorityInfo = priorityConfig[item.priority];
            const statusInfo = statusConfig[item.status];

            return (
              <tr
                key={item.slug}
                className="hover:bg-stone-50 transition-colors"
              >
                <td className="py-2 px-3 border-y border-neutral-100 whitespace-nowrap">
                  <Link
                    to="/roadmap/$slug/"
                    params={{ slug: item.slug }}
                    className="font-medium text-stone-700 hover:text-stone-900 hover:underline"
                  >
                    {item.title}
                  </Link>
                </td>
                <td className="py-2 px-3 border-y border-l border-neutral-100">
                  <span
                    className={cn([
                      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap",
                      statusInfo.className,
                    ])}
                  >
                    <Icon icon={statusInfo.icon} />
                    {statusInfo.label}
                  </span>
                </td>
                <td className="py-2 px-3 border-y border-l border-neutral-100">
                  <span
                    className={cn([
                      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap",
                      priorityInfo.className,
                    ])}
                  >
                    {priorityInfo.label}
                  </span>
                </td>
                <td className="py-2 px-3 border-y border-l border-neutral-100 text-sm text-stone-500 whitespace-nowrap">
                  {item.date || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CTASection({
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
    <section className="mt-16 py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 -mx-6 px-6">
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
          Where conversations
          <br className="sm:hidden" /> stay yours
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Start using Char today and bring clarity to your back-to-back meetings
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
