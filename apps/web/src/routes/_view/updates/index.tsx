import { MDXContent } from "@content-collections/mdx/react";
import { createFileRoute } from "@tanstack/react-router";
import { allUpdates, type Update } from "content-collections";

import { defaultMDXComponents } from "@/components/mdx";

export const Route = createFileRoute("/_view/updates/")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Updates - Char" },
      {
        name: "description",
        content: "Weekly updates from the Char team",
      },
      { property: "og:title", content: "Updates - Char" },
      {
        property: "og:description",
        content: "Weekly updates from the Char team",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://char.com/updates" },
    ],
  }),
});

function Component() {
  const sortedUpdates = [...allUpdates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-16 lg:py-24">
          <HeroSection />
        </div>
        <div>
          {sortedUpdates.map((update, index) => (
            <div key={update.slug}>
              <div className="max-w-3xl mx-auto px-6">
                <UpdateSection update={update} />
              </div>
              {index < sortedUpdates.length - 1 && (
                <div className="border-b border-neutral-100 my-12" />
              )}
            </div>
          ))}
        </div>
        <div className="px-6 pb-16 lg:pb-24" />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700 mb-6">
        Updates
      </h1>
      <p className="text-lg sm:text-xl text-neutral-600">
        Weekly updates from the Char team
      </p>
    </div>
  );
}

function UpdateSection({ update }: { update: Update }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-12">
      <div className="md:sticky md:top-24 md:self-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-serif font-medium text-stone-700">
            {update.title}
          </h2>
          <time
            className="text-sm text-neutral-500 mt-1"
            dateTime={update.date}
          >
            {new Date(update.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
      </div>

      <div>
        <article className="prose prose-stone prose-sm prose-headings:font-serif prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1 prose-ul:my-2 prose-li:my-0.5 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-headings:no-underline prose-headings:decoration-transparent prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:text-stone-700 prose-img:rounded prose-img:border prose-img:border-neutral-200 prose-img:my-3 max-w-none">
          <MDXContent code={update.mdx} components={defaultMDXComponents} />
        </article>
      </div>
    </section>
  );
}
