import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { allOssFriends } from "content-collections";
import { useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/oss-friends")({
  component: Component,
  head: () => ({
    meta: [
      { title: "OSS Friends - Char" },
      {
        name: "description",
        content:
          "Discover amazing open source projects and tools built by our friends in the community. Char is proud to be part of the open source ecosystem.",
      },
      { property: "og:title", content: "OSS Friends - Char" },
      {
        property: "og:description",
        content:
          "Discover amazing open source projects and tools built by our friends in the community.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/oss-friends",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OSS Friends - Char" },
      {
        name: "twitter:description",
        content:
          "Discover amazing open source projects and tools built by our friends in the community.",
      },
    ],
  }),
});

const INITIAL_DISPLAY_COUNT = 12;
const LOAD_MORE_COUNT = 12;

function Component() {
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  const filteredFriends = useMemo(() => {
    if (!search.trim()) return allOssFriends;
    const query = search.toLowerCase();
    return allOssFriends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.description.toLowerCase().includes(query),
    );
  }, [search]);

  const isSearching = search.trim().length > 0;
  const displayedFriends = isSearching
    ? filteredFriends
    : filteredFriends.slice(0, displayCount);
  const hasMore = !isSearching && displayCount < filteredFriends.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + LOAD_MORE_COUNT);
  };

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection search={search} onSearchChange={setSearch} />
        <SlashSeparator />
        <FriendsSection
          friends={displayedFriends}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
        <SlashSeparator />
        <JoinSection />
      </div>
    </div>
  );
}

function HeroSection({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-8 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
            OSS Friends
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-8">
            Discover amazing open source projects and tools built by our friends
            in the community. We believe in the power of open source and are
            proud to be part of this ecosystem.
          </p>
          <div className="max-w-md mx-auto">
            <div
              className={cn([
                "relative flex items-center",
                "border border-neutral-200 rounded-full bg-white",
                "focus-within:border-stone-400 transition-colors",
              ])}
            >
              <Icon
                icon="mdi:magnify"
                className="absolute left-4 text-xl text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-12 py-3 rounded-full bg-transparent outline-hidden text-neutral-800 placeholder:text-neutral-400"
              />
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}

function FriendsSection({
  friends,
  hasMore,
  onLoadMore,
}: {
  friends: typeof allOssFriends;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-200">
        {friends.map((friend) => (
          <a
            key={friend.slug}
            href={friend.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn([
              "group flex flex-col bg-white overflow-hidden h-full",
              "hover:bg-stone-50 transition-all",
              "border-b border-neutral-200",
            ])}
          >
            <div className="aspect-40/21 bg-neutral-100 overflow-hidden shrink-0">
              <Image
                src={friend.image || "/api/images/hyprnote/default-cover.jpg"}
                alt={friend.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                objectFit="cover"
                layout="fullWidth"
              />
            </div>
            <div className="p-4 flex flex-col flex-1 border-t border-neutral-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-medium text-stone-600 group-hover:text-stone-800">
                  {friend.name}
                </h3>
                <Icon
                  icon="mdi:arrow-top-right"
                  className="text-lg text-neutral-400 group-hover:text-stone-600 transition-colors shrink-0"
                />
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed mb-3 flex-1 line-clamp-2">
                {friend.description}
              </p>
              <a
                href={friend.github}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors mt-auto"
              >
                <Icon icon="mdi:github" className="text-sm" />
                <span>View on GitHub</span>
              </a>
            </div>
          </a>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center py-8 bg-white">
          <button
            onClick={onLoadMore}
            className={cn([
              "cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-full",
              "border border-neutral-200 text-neutral-700",
              "bg-linear-to-t from-stone-100 to-white",
              "hover:from-stone-200 hover:to-stone-50 hover:border-stone-300 transition-all",
            ])}
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

function JoinSection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-4">
          Want to be listed?
        </h2>
        <p className="text-neutral-600 mb-6">
          If you're building an open source project and would like to be
          featured on this page, we'd love to hear from you.
        </p>
        <a
          href="https://github.com/fastrepl/char/issues/new?title=OSS%20Friends%20Request&body=Project%20Name:%0AProject%20URL:%0ADescription:"
          target="_blank"
          rel="noopener noreferrer"
          className={cn([
            "inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-full",
            "bg-linear-to-t from-neutral-800 to-neutral-700 text-white",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          <Icon icon="mdi:github" className="text-lg" />
          Submit your project
        </a>
      </div>
    </section>
  );
}
