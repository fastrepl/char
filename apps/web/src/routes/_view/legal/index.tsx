import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allLegals } from "content-collections";

export const Route = createFileRoute("/_view/legal/")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Legal - Char" },
      {
        name: "description",
        content: "Terms, privacy policy, and other legal documents for Char",
      },
      { property: "og:title", content: "Legal - Char" },
      {
        property: "og:description",
        content: "Terms, privacy policy, and other legal documents for Char",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/legal" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Legal - Char" },
      {
        name: "twitter:description",
        content: "Terms, privacy policy, and other legal documents for Char",
      },
    ],
  }),
});

function Component() {
  return (
    <div
      className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-x border-neutral-100 bg-white">
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-serif text-stone-600 mb-4">
            Legal
          </h1>
          <p className="text-lg text-neutral-600">
            Terms, privacy policy, and other legal documents
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {allLegals.map((doc) => (
            <LegalCard key={doc.slug} doc={doc} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LegalCard({ doc }: { doc: (typeof allLegals)[number] }) {
  return (
    <Link
      to="/legal/$slug/"
      params={{ slug: doc.slug }}
      className="group block"
    >
      <article className="h-full border border-neutral-100 rounded-xs bg-white hover:shadow-md hover:border-neutral-200 transition-all duration-300 p-6">
        <div className="flex items-start gap-3 mb-3">
          <Icon
            icon="mdi:file-document-outline"
            className="text-xl text-stone-600 group-hover:text-stone-800 transition-colors shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-serif text-stone-600 group-hover:text-stone-800 transition-colors mb-2">
              {doc.title}
            </h3>
            <p className="text-sm text-neutral-500 line-clamp-2">
              {doc.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-neutral-500 mt-4 pt-4 border-t border-neutral-100">
          <span className="text-xs">
            Updated{" "}
            {new Date(doc.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="group-hover:text-stone-600 transition-colors font-medium">
            Read →
          </span>
        </div>
      </article>
    </Link>
  );
}
