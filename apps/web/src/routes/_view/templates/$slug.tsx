import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allTemplates } from "content-collections";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { MDXLink } from "@/components/mdx";

export const Route = createFileRoute("/_view/templates/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const template = allTemplates.find(
      (template) => template.slug === params.slug,
    );
    if (!template) {
      throw notFound();
    }
    return { template };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.template) {
      return { meta: [] };
    }

    const { template } = loaderData;
    const url = `https://hyprnote.com/templates/${template.slug}`;

    const ogImageUrl = `https://hyprnote.com/og?type=templates&title=${encodeURIComponent(template.title)}&category=${encodeURIComponent(template.category)}${template.description ? `&description=${encodeURIComponent(template.description)}` : ""}&v=1`;

    return {
      meta: [
        { title: `${template.title} - Hyprnote Templates` },
        { name: "description", content: template.description },
        { name: "robots", content: "noindex, nofollow" },
        {
          property: "og:title",
          content: `${template.title} - Meeting Template`,
        },
        { property: "og:description", content: template.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: `${template.title} - Meeting Template`,
        },
        { name: "twitter:description", content: template.description },
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
});

function Component() {
  const { template } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <div className="min-h-screen max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="flex">
          <LeftSidebar template={template} />
          <MainContent template={template} />
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

function LeftSidebar({ template }: { template: (typeof allTemplates)[0] }) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-[69px] max-h-[calc(100vh-69px)] overflow-y-auto px-4 pt-6 pb-18 scrollbar-hide">
        <Link
          to="/templates/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors mb-6 font-serif"
        >
          <Icon icon="mdi:arrow-left" className="text-base" />
          <span>Back to templates</span>
        </Link>

        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Category
            </h3>
            <Link
              to="/templates/"
              search={{ category: template.category }}
              className="text-sm text-stone-600 hover:text-stone-800 transition-colors"
            >
              {template.category}
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
                Structure
              </a>
              <a
                href="#examples"
                className="block text-sm text-neutral-500 hover:text-stone-600 py-1 transition-colors"
              >
                Examples
              </a>
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MainContent({ template }: { template: (typeof allTemplates)[0] }) {
  return (
    <main className="flex-1 min-w-0 pb-6 px-4 lg:px-8 py-6">
      <div className="lg:hidden mb-6">
        <Link
          to="/templates/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors font-serif"
        >
          <Icon icon="mdi:arrow-left" className="text-base" />
          <span>Back to templates</span>
        </Link>
      </div>

      <TemplateHeader template={template} />
      <TemplateContent template={template} />
      <ExamplesSection />
      <SuggestedTemplates template={template} />
      <TemplateFooter />
    </main>
  );
}

function TemplateHeader({ template }: { template: (typeof allTemplates)[0] }) {
  return (
    <header id="overview" className="mb-8 lg:mb-12 scroll-mt-20">
      <div className="lg:hidden mb-4">
        <span className="text-sm text-neutral-500">{template.category}</span>
      </div>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-stone-600 mb-4">
        {template.title}
      </h1>
      <p className="text-lg lg:text-xl text-neutral-600 leading-relaxed mb-6">
        {template.description}
      </p>

      <div className="flex flex-wrap gap-2">
        {template.targets.map((target) => (
          <span
            key={target}
            className="text-sm px-3 py-1 bg-stone-50 text-stone-600 rounded-full border border-stone-100"
          >
            {target}
          </span>
        ))}
      </div>
    </header>
  );
}

function TemplateContent({ template }: { template: (typeof allTemplates)[0] }) {
  return (
    <section id="content" className="scroll-mt-20">
      <h2 className="text-xl font-serif text-stone-700 mb-4">Structure</h2>
      <div className="border border-neutral-200 rounded-xs px-6 lg:px-8 pt-3 lg:pt-4 pb-6 lg:pb-8 bg-white">
        <div className="prose prose-stone prose-headings:font-mono prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-p:text-neutral-600 max-w-none">
          <MDXContent code={template.mdx} components={{ a: MDXLink }} />
        </div>
      </div>
    </section>
  );
}

function ExamplesSection() {
  return (
    <section id="examples" className="mt-12 scroll-mt-20">
      <h2 className="text-xl font-serif text-stone-700 mb-4">Examples</h2>
      <div className="border border-neutral-200 rounded-xs p-6 lg:p-8 bg-white">
        <p className="text-neutral-500 text-center py-8">
          Examples coming soon
        </p>
      </div>
    </section>
  );
}

function SuggestedTemplates({
  template,
}: {
  template: (typeof allTemplates)[0];
}) {
  const suggestedTemplates = allTemplates.filter(
    (t) => t.category === template.category && t.slug !== template.slug,
  );

  if (suggestedTemplates.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-serif text-stone-700 mb-4">
        Other {template.category} templates
      </h2>
      <div className="grid gap-4">
        {suggestedTemplates.map((t) => (
          <Link
            key={t.slug}
            to="/templates/$slug/"
            params={{ slug: t.slug }}
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

function TemplateFooter() {
  return (
    <footer className="mt-12 pt-8 border-t border-neutral-100">
      <Link
        to="/templates/"
        className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium"
      >
        <span>&larr;</span>
        <span>View all templates</span>
      </Link>
    </footer>
  );
}

function RightSidebar() {
  return (
    <aside className="hidden sm:block w-80 shrink-0">
      <div className="sticky top-[69px] flex flex-col gap-4 px-4 py-6">
        <div className="border border-neutral-200 rounded-xs overflow-hidden bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px] p-6 text-center">
          <h3 className="font-serif text-lg text-stone-600 mb-3">
            Use this template
          </h3>
          <p className="text-sm text-neutral-600 mb-6">
            Download Hyprnote to use this template and get AI-powered meeting
            notes.
          </p>
          <DownloadButton />
          <p className="text-xs text-neutral-500 mt-4">
            Free to use. No credit card required.
          </p>
        </div>

        <div className="border border-dashed border-neutral-300 rounded-xs p-6 bg-stone-50/50 text-center">
          <h3 className="font-serif text-lg text-stone-600 mb-3">
            Contribute a template
          </h3>
          <p className="text-sm text-neutral-600 mb-6">
            Have a template idea? Submit a PR and help the community.
          </p>
          <a
            href="https://github.com/fastrepl/hyprnote/tree/main/apps/web/content/templates"
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
