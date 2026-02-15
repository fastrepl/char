import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { allShortcuts } from "content-collections";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { MDXLink } from "@/components/mdx";
import { SlashSeparator } from "@/components/slash-separator";

type ShortcutsSearch = {
  category?: string;
};

export const Route = createFileRoute("/_view/shortcuts/")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): ShortcutsSearch => {
    return {
      category:
        typeof search.category === "string" ? search.category : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "AI Shortcuts - Char" },
      {
        name: "description",
        content:
          "Discover our library of AI shortcuts for meeting conversations. Extract action items, draft follow-up emails, get meeting insights, and more with quick chat commands.",
      },
      { property: "og:title", content: "AI Shortcuts - Char" },
      {
        property: "og:description",
        content:
          "Browse our collection of AI shortcuts. Quick commands for extracting insights, drafting emails, and analyzing your meeting conversations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/shortcuts" },
    ],
  }),
});

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShortcut, setSelectedShortcut] = useState<
    (typeof allShortcuts)[0] | null
  >(null);

  const selectedCategory = search.category || null;

  const setSelectedCategory = (category: string | null) => {
    navigate({ search: category ? { category } : {}, resetScroll: false });
  };

  const handleShortcutClick = (shortcut: (typeof allShortcuts)[0]) => {
    setSelectedShortcut(shortcut);
    window.history.pushState({}, "", `/shortcuts/${shortcut.slug}`);
  };

  const handleModalClose = useCallback(() => {
    setSelectedShortcut(null);
    const url = selectedCategory
      ? `/shortcuts?category=${encodeURIComponent(selectedCategory)}`
      : "/shortcuts";
    window.history.pushState({}, "", url);
  }, [selectedCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedShortcut) {
        handleModalClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShortcut, handleModalClose]);

  useEffect(() => {
    if (selectedShortcut) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedShortcut]);

  const shortcutsByCategory = getShortcutsByCategory();
  const categories = Object.keys(shortcutsByCategory);

  const filteredShortcuts = useMemo(() => {
    let shortcuts = allShortcuts;

    if (selectedCategory) {
      shortcuts = shortcuts.filter((s) => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      shortcuts = shortcuts.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query),
      );
    }

    return shortcuts;
  }, [searchQuery, selectedCategory]);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <ContributeBanner />
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <QuoteSection />
        <MobileCategoriesSection
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <ShortcutsSection
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          shortcutsByCategory={shortcutsByCategory}
          filteredShortcuts={filteredShortcuts}
          onShortcutClick={handleShortcutClick}
        />
        <SlashSeparator />
        <CTASection />
      </div>

      {selectedShortcut && (
        <ShortcutModal shortcut={selectedShortcut} onClose={handleModalClose} />
      )}
    </div>
  );
}

function ContributeBanner() {
  return (
    <a
      href="https://github.com/fastrepl/char/issues/new?title=Suggest%20New%20Shortcut&body=Title:%20Extract%20Action%20Items%0ACategory:%20Productivity%0ADescription:%20A%20shortcut%20to%20extract%20all%20action%20items%20from%20the%20meeting%0A%0AStructure%20(list%20of%20sections%2C%20each%20with%20a%20title%20and%20what%20to%20include):%0A-%20Action%20Items:%20List%20of%20tasks%20with%20owners%0A-%20Deadlines:%20Due%20dates%20mentioned%0A-%20Dependencies:%20Blockers%20or%20prerequisites"
      target="_blank"
      rel="noopener noreferrer"
      className={cn([
        "group flex items-center justify-center gap-2 text-center cursor-pointer",
        "bg-stone-50/70 border-b border-stone-100 hover:bg-stone-100/70",
        "py-3 px-4",
        "font-serif text-sm text-stone-700",
        "transition-colors",
      ])}
    >
      Have a shortcut idea? Contribute on{" "}
      <span className="group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-2 items-center inline-flex gap-0.5">
        <Icon
          icon="mdi:github"
          className="text-base inline-block align-middle"
        />{" "}
        GitHub
      </span>
    </a>
  );
}

function HeroSection({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <section className="flex flex-col items-center text-center gap-8 py-24 px-4 laptop:px-0">
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
            Shortcuts
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Quick AI commands for your meeting conversations. Use shortcuts in
            the chat assistant to extract insights, draft emails, and analyze
            discussions instantly.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="relative flex items-center border-2 border-neutral-200 focus-within:border-stone-500 rounded-full overflow-hidden transition-all duration-200">
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm outline-hidden bg-white text-center placeholder:text-center"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function QuoteSection() {
  return (
    <div className="py-4 px-4 text-center border-y border-neutral-100 bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <p className="text-base text-stone-600 font-serif italic">
        "Curated by Char and the community"
      </p>
    </div>
  );
}

function MobileCategoriesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}) {
  return (
    <div className="lg:hidden border-b border-neutral-100 bg-stone-50">
      <div className="flex overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn([
            "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 cursor-pointer",
            selectedCategory === null
              ? "bg-stone-600 text-white"
              : "text-stone-600 hover:bg-stone-100",
          ])}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn([
              "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 last:border-r-0 cursor-pointer",
              selectedCategory === category
                ? "bg-stone-600 text-white"
                : "text-stone-600 hover:bg-stone-100",
            ])}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortcutsSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  shortcutsByCategory,
  filteredShortcuts,
  onShortcutClick,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  shortcutsByCategory: Record<string, typeof allShortcuts>;
  filteredShortcuts: typeof allShortcuts;
  onShortcutClick: (shortcut: (typeof allShortcuts)[0]) => void;
}) {
  return (
    <div className="px-6 pt-8 pb-12 lg:pt-12 lg:pb-20">
      <div className="flex gap-8">
        <DesktopSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          shortcutsByCategory={shortcutsByCategory}
        />
        <ShortcutsGrid
          filteredShortcuts={filteredShortcuts}
          onShortcutClick={onShortcutClick}
        />
      </div>
    </div>
  );
}

function DesktopSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  shortcutsByCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  shortcutsByCategory: Record<string, typeof allShortcuts>;
}) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-21.25">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
          Categories
        </h3>
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn([
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              selectedCategory === null
                ? "bg-stone-100 text-stone-800"
                : "text-stone-600 hover:bg-stone-50",
            ])}
          >
            All Shortcuts
            <span className="ml-2 text-xs text-neutral-400">
              ({allShortcuts.length})
            </span>
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn([
                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                selectedCategory === category
                  ? "bg-stone-100 text-stone-800"
                  : "text-stone-600 hover:bg-stone-50",
              ])}
            >
              {category}
              <span className="ml-2 text-xs text-neutral-400">
                ({shortcutsByCategory[category].length})
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function ShortcutsGrid({
  filteredShortcuts,
  onShortcutClick,
}: {
  filteredShortcuts: typeof allShortcuts;
  onShortcutClick: (shortcut: (typeof allShortcuts)[0]) => void;
}) {
  if (filteredShortcuts.length === 0) {
    return (
      <section className="flex-1 min-w-0">
        <div className="text-center py-12">
          <Icon
            icon="mdi:file-search"
            className="text-6xl text-neutral-300 mb-4 mx-auto"
          />
          <p className="text-neutral-600">
            No shortcuts found matching your search.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredShortcuts.map((shortcut) => (
          <ShortcutCard
            key={shortcut.slug}
            shortcut={shortcut}
            onClick={() => onShortcutClick(shortcut)}
          />
        ))}
        <ContributeCard />
      </div>
    </section>
  );
}

function ShortcutCard({
  shortcut,
  onClick,
}: {
  shortcut: (typeof allShortcuts)[0];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group p-4 border border-neutral-200 rounded-xs bg-white hover:shadow-md hover:border-neutral-300 transition-all text-left cursor-pointer flex flex-col items-start"
    >
      <div className="mb-4 w-full">
        <p className="text-xs text-neutral-500 mb-2">
          <span className="font-medium">Shortcut</span>
          <span className="mx-1">/</span>
          <span>{shortcut.category}</span>
        </p>
        <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
          {shortcut.title}
        </h3>
        <p className="text-sm text-neutral-600 line-clamp-2">
          {shortcut.description}
        </p>
      </div>
    </button>
  );
}

function ContributeCard() {
  return (
    <div className="p-4 border border-dashed border-neutral-300 rounded-xs bg-stone-50/50 flex flex-col items-center justify-center text-center">
      <h3 className="font-serif text-lg text-stone-600 mb-2">
        Contribute a shortcut
      </h3>
      <p className="text-sm text-neutral-500 mb-4">
        Have a shortcut idea? Submit a PR and help the community.
      </p>
      <a
        href="https://github.com/fastrepl/char/issues/new?title=Suggest%20New%20Shortcut&body=Title:%20Extract%20Action%20Items%0ACategory:%20Productivity%0ADescription:%20A%20shortcut%20to%20extract%20all%20action%20items%20from%20the%20meeting%0A%0AStructure%20(list%20of%20sections%2C%20each%20with%20a%20title%20and%20what%20to%20include):%0A-%20Action%20Items:%20List%20of%20tasks%20with%20owners%0A-%20Deadlines:%20Due%20dates%20mentioned%0A-%20Dependencies:%20Blockers%20or%20prerequisites"
        target="_blank"
        rel="noopener noreferrer"
        className={cn([
          "group px-4 h-10 inline-flex items-center justify-center gap-2 w-fit",
          "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all cursor-pointer text-sm",
        ])}
      >
        <Icon icon="mdi:github" className="text-base" />
        Submit your idea
      </a>
    </div>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-6 text-center">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
          Ready to transform your meetings?
        </h2>
        <p className="text-lg text-neutral-600">
          Download Char and start using these shortcuts to get instant insights
          from your meeting conversations.
        </p>
        <div className="flex flex-col items-center gap-4 pt-4">
          <DownloadButton />
          <p className="text-sm text-neutral-500">
            Free to use. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}

function ShortcutModal({
  shortcut,
  onClose,
}: {
  shortcut: (typeof allShortcuts)[0];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="absolute inset-4 sm:inset-8 lg:inset-16 flex items-start justify-center overflow-y-auto">
        <div
          className={cn([
            "relative w-full max-w-2xl my-8",
            "bg-[url('/api/images/texture/white-leather.png')]",
            "rounded-xs shadow-2xl",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn([
              "absolute inset-0 rounded-xs",
              "bg-[url('/api/images/texture/paper.png')] opacity-30",
            ])}
          />
          <div className="relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-stone-800 transition-colors cursor-pointer z-10"
            >
              <Icon icon="mdi:close" className="text-lg" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-600">
                  Shortcut
                </span>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  {shortcut.category}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-stone-700 mb-3">
                {shortcut.title}
              </h2>
              <p className="text-neutral-600 mb-6">{shortcut.description}</p>

              <div className="flex flex-col gap-6">
                <div className="prose prose-stone prose-sm prose-headings:font-serif prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-p:text-neutral-600 prose-p:text-sm max-w-none">
                  <MDXContent code={shortcut.mdx} components={{ a: MDXLink }} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-200/50">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <DownloadButton />
                  <p className="text-sm text-neutral-500 text-center sm:text-left">
                    Download Char to use this shortcut
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getShortcutsByCategory() {
  return allShortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof allShortcuts>,
  );
}
