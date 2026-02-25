import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allShortcuts, allTemplates } from "content-collections";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { MDXLink } from "@/components/mdx";

type GalleryType = "template" | "shortcut";

export const Route = createFileRoute("/_view/gallery/$type/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const { type, slug } = params;

    if (type !== "template" && type !== "shortcut") {
      throw notFound();
    }

    if (type === "template") {
      const template = allTemplates.find((t) => t.slug === slug);
      if (!template) {
        throw notFound();
      }
      return { type: "template" as const, item: template };
    } else {
      const shortcut = allShortcuts.find((s) => s.slug === slug);
      if (!shortcut) {
        throw notFound();
      }
      return { type: "shortcut" as const, item: shortcut };
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };

    const { type, item } = loaderData;
    const typeLabel = type === "template" ? "Template" : "Shortcut";
    const url = `https://char.com/gallery/${type}/${item.slug}`;

    const ogType = type === "template" ? "templates" : "shortcuts";
    const ogImageUrl = `https://char.com/og?type=${ogType}&title=${encodeURIComponent(item.title)}&category=${encodeURIComponent(item.category)}${item.description ? `&description=${encodeURIComponent(item.description)}` : ""}&v=1`;

    return {
      meta: [
        { title: `${item.title} - ${typeLabel} - Char` },
        { name: "description", content: item.description },
        {
          property: "og:title",
          content: `${item.title} - ${typeLabel}`,
        },
        { property: "og:description", content: item.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: `${item.title} - ${typeLabel}`,
        },
        { name: "twitter:description", content: item.description },
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
});

function Component() {
  const data = Route.useLoaderData();
  const { type, item } = data;

  return (
    <div className="min-h-screen">
      <div className="min-h-screen max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="flex">
          <LeftSidebar type={type} item={item} />
          <MainContent type={type} item={item} />
          <RightSidebar type={type} item={item} />
        </div>
      </div>
    </div>
  );
}

function LeftSidebar({
  type,
  item,
}: {
  type: GalleryType;
  item: (typeof allTemplates)[0] | (typeof allShortcuts)[0];
}) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-17.25 max-h-[calc(100vh-69px)] overflow-y-auto px-4 pt-6 pb-18 scrollbar-hide">
        <Link
          to="/gallery/"
          search={{ type }}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors mb-6 font-serif"
        >
          <Icon icon="mdi:arrow-left" className="text-base" />
          <span>Back to gallery</span>
        </Link>

        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Type
            </h3>
            <span
              className={cn([
                "text-xs px-2 py-0.5 rounded-full font-medium",
                type === "template"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-purple-50 text-purple-600",
              ])}
            >
              {type === "template" ? "Template" : "Shortcut"}
            </span>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Category
            </h3>
            <Link
              to="/gallery/"
              search={{ type, category: item.category }}
              className="text-sm text-stone-600 hover:text-stone-800 transition-colors"
            >
              {item.category}
            </Link>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              On this page
            </h3>
            <nav className="flex flex-col gap-1">
              <a
                href="#content"
                className="block text-sm text-neutral-500 hover:text-stone-600 py-1 transition-colors"
              >
                {type === "template" ? "Structure" : "Details"}
              </a>
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MainContent({
  type,
  item,
}: {
  type: GalleryType;
  item: (typeof allTemplates)[0] | (typeof allShortcuts)[0];
}) {
  return (
    <main className="flex-1 min-w-0 pb-6 px-4 lg:px-8 py-6">
      <div className="lg:hidden mb-6">
        <Link
          to="/gallery/"
          search={{ type }}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors font-serif"
        >
          <Icon icon="mdi:arrow-left" className="text-base" />
          <span>Back to gallery</span>
        </Link>
      </div>

      <ItemHeader type={type} item={item} />
      <ItemContent type={type} item={item} />
      <SuggestedItems type={type} item={item} />
      <ItemFooter type={type} />
    </main>
  );
}

function ItemHeader({
  type,
  item,
}: {
  type: GalleryType;
  item: (typeof allTemplates)[0] | (typeof allShortcuts)[0];
}) {
  const isTemplate = type === "template";

  return (
    <header id="overview" className="mb-8 lg:mb-12 scroll-mt-20">
      <div className="lg:hidden mb-4 flex items-center gap-2">
        <span
          className={cn([
            "text-xs px-2 py-0.5 rounded-full font-medium",
            isTemplate
              ? "bg-blue-50 text-blue-600"
              : "bg-purple-50 text-purple-600",
          ])}
        >
          {isTemplate ? "Template" : "Shortcut"}
        </span>
        <span className="text-sm text-neutral-500">{item.category}</span>
      </div>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-stone-600 mb-4">
        {item.title}
      </h1>
      <p className="text-lg lg:text-xl text-neutral-600 leading-relaxed mb-6">
        {item.description}
      </p>

      {isTemplate && "targets" in item && item.targets && (
        <div className="flex flex-wrap gap-2">
          {item.targets.map((target) => (
            <span
              key={target}
              className="text-sm px-3 py-1 bg-stone-50 text-stone-600 rounded-full border border-stone-100"
            >
              {target}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

function ItemContent({
  type,
  item,
}: {
  type: GalleryType;
  item: (typeof allTemplates)[0] | (typeof allShortcuts)[0];
}) {
  const isTemplate = type === "template";

  return (
    <section id="content" className="scroll-mt-20">
      <h2 className="text-xl font-serif text-stone-700 mb-4">
        {isTemplate ? "Structure" : "Details"}
      </h2>
      <div className="border border-neutral-200 rounded-xs px-6 lg:px-8 pt-3 lg:pt-4 pb-6 lg:pb-8 bg-white">
        {isTemplate && "sections" in item && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">
              Template Sections
            </h3>
            <div className="flex flex-col gap-3">
              {item.sections.map((section, index) => (
                <div
                  key={section.title}
                  className="p-3 rounded-lg bg-stone-50 border border-stone-100"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-600 text-xs font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-stone-700 text-sm">
                      {section.title}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-600 ml-8">
                    {section.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prose prose-stone prose-headings:font-mono prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-p:text-neutral-600 max-w-none">
          <MDXContent code={item.mdx} components={{ a: MDXLink }} />
        </div>
      </div>
    </section>
  );
}

function SuggestedItems({
  type,
  item,
}: {
  type: GalleryType;
  item: (typeof allTemplates)[0] | (typeof allShortcuts)[0];
}) {
  const suggestedItems =
    type === "template"
      ? allTemplates.filter(
          (t) => t.category === item.category && t.slug !== item.slug,
        )
      : allShortcuts.filter(
          (s) => s.category === item.category && s.slug !== item.slug,
        );

  if (suggestedItems.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-serif text-stone-700 mb-4">
        Other {item.category} {type === "template" ? "templates" : "shortcuts"}
      </h2>
      <div className="grid gap-4">
        {suggestedItems.map((t) => (
          <Link
            key={t.slug}
            to="/gallery/$type/$slug/"
            params={{ type, slug: t.slug }}
            className="group p-4 border border-neutral-200 rounded-xs bg-white hover:shadow-md hover:border-neutral-300 transition-all"
          >
            <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
              {t.title}
            </h3>
            <p className="text-sm text-neutral-600 line-clamp-2">
              {t.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ItemFooter({ type }: { type: GalleryType }) {
  return (
    <footer className="mt-12 pt-8 border-t border-neutral-100">
      <Link
        to="/gallery/"
        search={{ type }}
        className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium"
      >
        <span>&larr;</span>
        <span>View all {type === "template" ? "templates" : "shortcuts"}</span>
      </Link>
    </footer>
  );
}

function RightSidebar({
  type,
  item,
}: {
  type: GalleryType;
  item: (typeof allTemplates)[0] | (typeof allShortcuts)[0];
}) {
  const isTemplate = type === "template";
  const contentDir = isTemplate ? "templates" : "shortcuts";
  const rawMdxUrl = `https://github.com/fastrepl/char/blob/main/apps/web/content/${contentDir}/${item.slug}.mdx?plain=1`;

  return (
    <aside className="hidden sm:block w-80 shrink-0">
      <div className="sticky top-17.25 flex flex-col gap-4 px-4 py-6">
        <div className="border border-neutral-200 rounded-xs overflow-hidden bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px] p-6 text-center">
          <h3 className="font-serif text-lg text-stone-600 mb-3">
            Use this {isTemplate ? "template" : "shortcut"}
          </h3>
          <p className="text-sm text-neutral-600 mb-6">
            Download Char to use this {isTemplate ? "template" : "shortcut"} and
            get AI-powered meeting notes.
          </p>
          <DownloadButton />
          <p className="text-xs text-neutral-500 mt-4">
            Free to use. No credit card required.
          </p>
        </div>

        <a
          href={rawMdxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 border border-neutral-200 rounded-xs bg-white hover:bg-neutral-50 transition-colors text-sm text-neutral-600 hover:text-neutral-800"
        >
          <Icon icon="mdi:file-document-outline" className="text-lg" />
          View raw MDX source
        </a>

        <div className="border border-dashed border-neutral-300 rounded-xs p-6 bg-stone-50/50 text-center">
          <h3 className="font-serif text-lg text-stone-600 mb-3">Contribute</h3>
          <p className="text-sm text-neutral-600 mb-6">
            Have an idea? Submit a PR and help the community.
          </p>
          <a
            href={`https://github.com/fastrepl/char/tree/main/apps/web/content/${contentDir}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn([
              "group px-6 h-12 inline-flex items-center justify-center gap-2 w-fit",
              "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all cursor-pointer text-base sm:text-lg",
            ])}
          >
            <Icon icon="mdi:github" className="text-xl" />
            Open on GitHub
          </a>
        </div>
      </div>
    </aside>
  );
}
