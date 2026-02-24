import { MDXContent } from "@content-collections/mdx/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allArticles } from "content-collections";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { Image } from "@/components/image";
import { defaultMDXComponents } from "@/components/mdx";
import { SlashSeparator } from "@/components/slash-separator";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";
import { AUTHOR_AVATARS } from "@/lib/team";

export const Route = createFileRoute("/_view/blog/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const article = allArticles.find((article) => article.slug === params.slug);
    if (!article || (!import.meta.env.DEV && article.published !== true)) {
      throw notFound();
    }

    if (!import.meta.env.DEV && article.published === false) {
      throw notFound();
    }

    const relatedArticles = allArticles
      .filter(
        (a) =>
          a.slug !== article.slug &&
          (import.meta.env.DEV || a.published === true),
      )
      .sort((a, b) => {
        const aScore = a.author === article.author ? 1 : 0;
        const bScore = b.author === article.author ? 1 : 0;
        if (aScore !== bScore) {
          return bScore - aScore;
        }

        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 3);

    return { article, relatedArticles };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.article) {
      return { meta: [] };
    }

    const { article } = loaderData;
    const url = `https://hyprnote.com/blog/${article.slug}`;

    const ogImage =
      article.coverImage ||
      `https://hyprnote.com/og?type=blog&title=${encodeURIComponent(article.title)}${article.author ? `&author=${encodeURIComponent(article.author)}` : ""}${article.date ? `&date=${encodeURIComponent(new Date(article.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}` : ""}&v=1`;

    return {
      meta: [
        { title: `${article.title} - Hyprnote Blog` },
        { name: "description", content: article.meta_description },
        { tag: "link", attrs: { rel: "canonical", href: url } },
        {
          property: "og:title",
          content: `${article.title} - Hyprnote Blog`,
        },
        {
          property: "og:description",
          content: article.meta_description,
        },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: `${article.title} - Hyprnote Blog`,
        },
        {
          name: "twitter:description",
          content: article.meta_description,
        },
        { name: "twitter:image", content: ogImage },
        ...(article.author
          ? [{ name: "author", content: article.author }]
          : []),
        {
          property: "article:published_time",
          content: article.date,
        },
      ],
    };
  },
});

function Component() {
  const { article, relatedArticles } = Route.useLoaderData();

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection article={article} />
        <SlashSeparator />
        <div className="max-w-200 mx-auto px-4 py-8">
          <ArticleContent article={article} />
          <RelatedArticlesSection relatedArticles={relatedArticles} />
        </div>
        <SlashSeparator />
        <CTASection />
        <MobileCTA />
      </div>
    </main>
  );
}

function HeroSection({ article }: { article: any }) {
  const avatarUrl = AUTHOR_AVATARS[article.author];

  return (
    <header className="py-12 lg:py-16 text-center px-4">
      <Link
        to="/blog/"
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors mb-8"
      >
        <span>←</span>
        <span>Back to Blog</span>
      </Link>

      {article.category && (
        <p className="text-sm font-mono text-stone-500 mb-4">
          {article.category}
        </p>
      )}

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 mb-6">
        {article.title}
      </h1>

      {article.author && (
        <div className="flex items-center justify-center gap-3 mb-2">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={article.author}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <p className="text-base text-neutral-600">{article.author}</p>
        </div>
      )}

      <time
        dateTime={article.date}
        className="text-xs font-mono text-neutral-500"
      >
        {new Date(article.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
    </header>
  );
}

function ArticleContent({ article }: { article: any }) {
  return (
    <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-headings:no-underline prose-headings:decoration-transparent prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-xs prose-pre:prose-code:bg-transparent prose-pre:prose-code:border-0 prose-pre:prose-code:p-0 prose-img:rounded-xs prose-img:border prose-img:border-neutral-200 prose-img:my-8 max-w-none">
      <MDXContent code={article.mdx} components={defaultMDXComponents} />
    </article>
  );
}

function RelatedArticlesSection({
  relatedArticles,
}: {
  relatedArticles: any[];
}) {
  if (relatedArticles.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-8 border-t border-neutral-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-serif text-stone-600">More articles</h3>
        <Link
          to="/blog/"
          className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
        >
          See all
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {relatedArticles.map((related) => (
          <RelatedArticleCard key={related.slug} article={related} />
        ))}
      </div>
    </div>
  );
}

function CTASection() {
  const platform = usePlatform();
  const platformCTA = getPlatformCTA(platform);

  return (
    <section className="py-16 px-4 bg-linear-to-t from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Try Hyprnote for yourself
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          The AI notepad for people in back-to-back meetings. Local-first,
          privacy-focused, and open source.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {platformCTA.action === "download" ? (
            <DownloadButton />
          ) : (
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
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function MobileCTA() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  return (
    <motion.div
      className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white/95 backdrop-blur-xs p-4 z-20"
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : "100%" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Link
        to="/download/"
        className={cn([
          "group px-4 h-12 flex items-center justify-center text-base w-full",
          "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
          "hover:scale-[102%] active:scale-[98%]",
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
          className="h-5 w-5 ml-2 group-hover:translate-y-0.5 transition-transform"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      </Link>
    </motion.div>
  );
}

function RelatedArticleCard({ article }: { article: any }) {
  const ogImage =
    article.coverImage ||
    `https://hyprnote.com/og?type=blog&title=${encodeURIComponent(article.title)}${article.author ? `&author=${encodeURIComponent(article.author)}` : ""}${article.date ? `&date=${encodeURIComponent(new Date(article.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}` : ""}&v=1`;

  return (
    <Link
      to="/blog/$slug/"
      params={{ slug: article.slug }}
      className="group block border border-neutral-200 rounded-xs hover:border-neutral-200 hover:shadow-xs transition-all bg-white overflow-hidden"
    >
      <div className="aspect-40/21 overflow-hidden">
        <img
          src={ogImage}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <h4 className="font-serif text-sm text-stone-600 group-hover:text-stone-800 transition-colors line-clamp-2 mb-2">
          {article.title}
        </h4>
        <p className="text-xs text-neutral-500 line-clamp-2 mb-2">
          {article.summary}
        </p>
        <time dateTime={article.date} className="text-xs text-neutral-400">
          {new Date(article.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
    </Link>
  );
}
