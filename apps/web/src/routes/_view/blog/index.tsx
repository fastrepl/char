import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { allArticles, type Article } from "content-collections";
import { useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";
import { AUTHOR_AVATARS } from "@/lib/team";

const CATEGORIES = [
  "Product",
  "Comparisons",
  "Engineering",
  "Founders' notes",
  "Guides",
  "Char Weekly",
] as const;

type BlogSearch = {
  category?: string;
};

export const Route = createFileRoute("/_view/blog/")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): BlogSearch => {
    return {
      category:
        typeof search.category === "string" ? search.category : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Blog - Char Blog" },
      {
        name: "description",
        content: "Insights, updates, and stories from the Char team",
      },
      { property: "og:title", content: "Blog - Char Blog" },
      {
        property: "og:description",
        content: "Insights, updates, and stories from the Char team",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/blog" },
    ],
  }),
});

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  const sortedArticles = [...allArticles].sort((a, b) => {
    const aDate = a.date;
    const bDate = b.date;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const selectedCategory = search.category || null;

  const setSelectedCategory = (category: string | null) => {
    navigate({ search: category ? { category } : {}, resetScroll: false });
  };

  const featuredArticles = sortedArticles.filter((a) => a.featured);

  const articlesByCategory = useMemo(() => {
    return sortedArticles.reduce(
      (acc, article) => {
        const category = article.category;
        if (category) {
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(article);
        }
        return acc;
      },
      {} as Record<string, Article[]>,
    );
  }, [sortedArticles]);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === "featured") {
      return featuredArticles;
    }
    if (selectedCategory) {
      return sortedArticles.filter((a) => a.category === selectedCategory);
    }
    return sortedArticles;
  }, [sortedArticles, selectedCategory, featuredArticles]);

  const categoriesWithCount = CATEGORIES.filter(
    (cat) => articlesByCategory[cat]?.length,
  );

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white min-h-screen">
        <Header />
        {featuredArticles.length > 0 && (
          <FeaturedSection articles={featuredArticles} />
        )}
        <SlashSeparator />
        <MobileCategoriesSection
          categories={categoriesWithCount}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          hasFeatured={featuredArticles.length > 0}
        />
        <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex gap-8">
            <DesktopSidebar
              categories={categoriesWithCount}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              articlesByCategory={articlesByCategory}
              featuredCount={featuredArticles.length}
              totalArticles={sortedArticles.length}
            />
            <div className="flex-1 min-w-0">
              <AllArticlesSection
                articles={filteredArticles}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="py-16 text-center border-b border-neutral-100 bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <h1 className="text-4xl sm:text-5xl font-serif text-stone-600 mb-4">
        Blog
      </h1>
      <p className="text-lg text-neutral-600 max-w-2xl mx-auto px-4">
        Insights, updates, and stories from the Char team
      </p>
    </header>
  );
}

function MobileCategoriesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  hasFeatured,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  hasFeatured: boolean;
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
        {hasFeatured && (
          <button
            onClick={() => setSelectedCategory("featured")}
            className={cn([
              "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 cursor-pointer",
              selectedCategory === "featured"
                ? "bg-stone-600 text-white"
                : "text-stone-600 hover:bg-stone-100",
            ])}
          >
            Featured
          </button>
        )}
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

function DesktopSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  articlesByCategory,
  featuredCount,
  totalArticles,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  articlesByCategory: Record<string, Article[]>;
  featuredCount: number;
  totalArticles: number;
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
            All Articles
            <span className="ml-2 text-xs text-neutral-400">
              ({totalArticles})
            </span>
          </button>
          {featuredCount > 0 && (
            <button
              onClick={() => setSelectedCategory("featured")}
              className={cn([
                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                selectedCategory === "featured"
                  ? "bg-stone-100 text-stone-800"
                  : "text-stone-600 hover:bg-stone-50",
              ])}
            >
              Featured
              <span className="ml-2 text-xs text-neutral-400">
                ({featuredCount})
              </span>
            </button>
          )}
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
                ({articlesByCategory[category]?.length || 0})
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function FeaturedSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return null;
  }

  const [mostRecent, ...others] = articles;
  const displayedOthers = others.slice(0, 4);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div
        className={cn([
          "flex flex-col gap-3",
          "md:gap-4",
          "lg:grid lg:grid-cols-2",
        ])}
      >
        <MostRecentFeaturedCard article={mostRecent} />
        {displayedOthers.length > 0 && (
          <div
            className={cn([
              "flex flex-col gap-3",
              "md:flex-row md:gap-3",
              "lg:flex-col",
            ])}
          >
            {displayedOthers.map((article, index) => (
              <OtherFeaturedCard
                key={article._meta.filePath}
                article={article}
                className={index === 3 ? "hidden lg:block" : ""}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AllArticlesSection({
  articles,
  selectedCategory,
}: {
  articles: Article[];
  selectedCategory: string | null;
}) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">No articles yet. Check back soon!</p>
      </div>
    );
  }

  const title =
    selectedCategory === "featured" ? "Featured" : selectedCategory || "All";

  return (
    <section>
      <SectionHeader title={title} />
      <div className="divide-y divide-neutral-100 sm:divide-y-0">
        {articles.map((article) => (
          <ArticleListItem key={article._meta.filePath} article={article} />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <h2 className="text-2xl font-serif text-stone-600">{title}</h2>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

function MostRecentFeaturedCard({ article }: { article: Article }) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.date;
  const avatarUrl =
    Array.isArray(article.author) && article.author.length > 0
      ? AUTHOR_AVATARS[article.author[0]]
      : undefined;

  return (
    <Link
      to="/blog/$slug/"
      params={{ slug: article.slug }}
      className="group block"
    >
      <article
        className={cn([
          "h-full border border-neutral-100 rounded-xs overflow-hidden bg-white",
          "hover:shadow-xl transition-all duration-300",
        ])}
      >
        {hasCoverImage && (
          <ArticleImage
            src={article.coverImage}
            alt={article.title ?? "Article"}
            isLoaded={coverImageLoaded}
            onLoad={() => setCoverImageLoaded(true)}
            onError={() => setCoverImageError(true)}
            loading="eager"
          />
        )}

        <div className="p-6 md:p-8">
          {article.category && (
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 block">
              {article.category}
            </span>
          )}
          <h3
            className={cn([
              "text-xl font-serif text-stone-600 mb-2",
              "group-hover:text-stone-800 transition-colors line-clamp-2",
              "md:text-2xl md:mb-3",
            ])}
          >
            {article.title}
          </h3>

          <p className="text-neutral-600 leading-relaxed mb-4 line-clamp-2 md:line-clamp-3">
            {article.meta_description}
          </p>

          <div className="flex items-center gap-3 text-sm text-neutral-500">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={
                  Array.isArray(article.author)
                    ? article.author.join(", ")
                    : article.author
                }
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <span>
              {Array.isArray(article.author)
                ? article.author.join(", ")
                : article.author}
            </span>
            <span>·</span>
            <time dateTime={displayDate}>
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}

function OtherFeaturedCard({
  article,
  className,
}: {
  article: Article;
  className?: string;
}) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.date;
  const avatarUrl =
    Array.isArray(article.author) && article.author.length > 0
      ? AUTHOR_AVATARS[article.author[0]]
      : undefined;

  return (
    <Link
      to="/blog/$slug/"
      params={{ slug: article.slug }}
      className={cn([
        "group block md:flex-1 md:min-w-0 lg:flex-auto",
        className,
      ])}
    >
      <article
        className={cn([
          "h-full border border-neutral-100 rounded-xs overflow-hidden bg-white",
          "hover:shadow-xl transition-all duration-300",
          "flex flex-col",
          "lg:flex-row",
        ])}
      >
        {hasCoverImage && (
          <div
            className={cn([
              "aspect-40/21 shrink-0 overflow-hidden bg-stone-50",
              "border-b border-neutral-100",
              "lg:aspect-auto lg:w-32 lg:border-b-0 lg:border-r",
            ])}
          >
            <img
              src={article.coverImage}
              alt={article.title ?? "Article"}
              className={cn([
                "w-full h-full object-cover",
                "group-hover:scale-105 transition-all duration-500",
                coverImageLoaded ? "opacity-100" : "opacity-0",
              ])}
              onLoad={() => setCoverImageLoaded(true)}
              onError={() => setCoverImageError(true)}
              loading="lazy"
            />
          </div>
        )}

        <div
          className={cn([
            "flex-1 min-w-0 p-4 flex flex-col justify-center",
            "lg:p-4",
          ])}
        >
          {article.category && (
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              {article.category}
            </span>
          )}
          <h3
            className={cn([
              "text-base font-serif text-stone-600 mb-2",
              "group-hover:text-stone-800 transition-colors line-clamp-2",
            ])}
          >
            {article.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={
                  Array.isArray(article.author)
                    ? article.author.join(", ")
                    : article.author
                }
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            <span className="truncate">
              {Array.isArray(article.author)
                ? article.author.join(", ")
                : article.author}
            </span>
            <span>·</span>
            <time dateTime={displayDate} className="shrink-0">
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ArticleListItem({ article }: { article: Article }) {
  const displayDate = article.date;
  const avatarUrl =
    Array.isArray(article.author) && article.author.length > 0
      ? AUTHOR_AVATARS[article.author[0]]
      : undefined;

  return (
    <Link
      to="/blog/$slug/"
      params={{ slug: article.slug }}
      className="group block"
    >
      <article className="py-4 hover:bg-stone-50/50 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 min-w-0 sm:max-w-2xl">
            {article.category && (
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider shrink-0 hidden sm:inline">
                {article.category}
              </span>
            )}
            <span className="text-base font-serif text-stone-600 group-hover:text-stone-800 transition-colors truncate">
              {article.title}
            </span>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={
                    Array.isArray(article.author)
                      ? article.author.join(", ")
                      : article.author
                  }
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-neutral-500 whitespace-nowrap">
                {Array.isArray(article.author)
                  ? article.author.join(", ")
                  : article.author}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:hidden">
            <div className="flex items-center gap-3">
              {article.category && (
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  {article.category}
                </span>
              )}
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={
                    Array.isArray(article.author)
                      ? article.author.join(", ")
                      : article.author
                  }
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-neutral-500">{article.author}</span>
            </div>
            <time
              dateTime={displayDate}
              className="text-sm text-neutral-500 shrink-0 font-mono"
            >
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
          <div className="h-px flex-1 bg-neutral-200 hidden sm:block" />
          <time
            dateTime={displayDate}
            className="text-sm text-neutral-500 shrink-0 hidden sm:block whitespace-nowrap font-mono"
          >
            {new Date(displayDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
      </article>
    </Link>
  );
}

function ArticleImage({
  src,
  alt,
  isLoaded,
  onLoad,
  onError,
  loading,
}: {
  src: string | undefined;
  alt: string;
  isLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
  loading: "eager" | "lazy";
}) {
  if (!src) {
    return null;
  }

  return (
    <div className="aspect-40/21 overflow-hidden border-b border-neutral-100 bg-stone-50">
      <img
        src={src}
        alt={alt}
        className={cn([
          "w-full h-full object-cover group-hover:scale-105 transition-all duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
        ])}
        onLoad={onLoad}
        onError={onError}
        loading={loading}
      />
    </div>
  );
}
