import { MDXContent } from "@content-collections/mdx/react";
import { allHandbooks } from "content-collections";

import { cn } from "@hypr/utils";

import { SidebarDownloadCard } from "@/components/cta-card";
import { defaultMDXComponents } from "@/components/mdx";

export function HandbookLayout({
  doc,
  showSectionTitle = true,
}: {
  doc: any;
  showSectionTitle?: boolean;
}) {
  return (
    <>
      <main className="flex-1 min-w-0 px-4 py-6">
        <ArticleHeader doc={doc} showSectionTitle={showSectionTitle} />
        <ArticleContent doc={doc} />
      </main>

      <RightSidebar toc={doc.toc} />
    </>
  );
}

function ArticleHeader({
  doc,
  showSectionTitle,
}: {
  doc: any;
  showSectionTitle: boolean;
}) {
  const sectionTitle =
    allHandbooks.find((d) => d.sectionFolder === doc.sectionFolder && d.isIndex)
      ?.title ||
    doc.sectionFolder
      .split("-")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <header className="mb-8 lg:mb-12">
      {showSectionTitle && (
        <div className="inline-flex items-center gap-2 text-sm text-neutral-500 mb-4">
          <span>{sectionTitle}</span>
        </div>
      )}
      <h1 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
        {doc.title}
      </h1>
      {doc.summary && (
        <p className="text-lg lg:text-xl text-neutral-600 leading-relaxed mb-6">
          {doc.summary}
        </p>
      )}

      {(doc.author || doc.created) && (
        <div className="flex items-center gap-4 text-sm text-neutral-500">
          {doc.author && <span>{doc.author}</span>}
          {doc.author && doc.created && <span>·</span>}
          {doc.created && (
            <time dateTime={doc.created}>
              {new Date(doc.created).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          {doc.updated && doc.updated !== doc.created && (
            <>
              <span>·</span>
              <span className="text-neutral-400">
                Updated{" "}
                {new Date(doc.updated).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function ArticleContent({ doc }: { doc: any }) {
  return (
    <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-headings:no-underline prose-headings:decoration-transparent prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-xs prose-pre:prose-code:bg-transparent prose-pre:prose-code:border-0 prose-pre:prose-code:p-0 prose-img:rounded-xs prose-img:my-8 max-w-none">
      <MDXContent code={doc.mdx} components={defaultMDXComponents} />
    </article>
  );
}

function RightSidebar({
  toc,
}: {
  toc: Array<{ id: string; text: string; level: number }>;
}) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-17.25 max-h-[calc(100vh-69px)] overflow-y-auto flex flex-col gap-6 px-4 py-6">
        {toc.length > 0 && (
          <nav className="flex flex-col gap-1">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
              On this page
            </p>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn([
                  "block text-sm py-1 transition-colors border-l-2",
                  item.level === 4 && "pl-6",
                  item.level === 3 && "pl-4",
                  item.level === 2 && "pl-2",
                  "border-transparent text-neutral-600 hover:text-stone-600 hover:border-neutral-300",
                ])}
              >
                {item.text}
              </a>
            ))}
          </nav>
        )}

        <SidebarDownloadCard />
      </div>
    </aside>
  );
}
