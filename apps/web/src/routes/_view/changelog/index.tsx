import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import semver from "semver";

import { cn } from "@hypr/utils";

import { type ChangelogWithMeta, getChangelogList } from "@/changelog";
import { defaultMDXComponents } from "@/components/mdx";
import { getDownloadLinks, groupDownloadLinks } from "@/utils/download";

export const Route = createFileRoute("/_view/changelog/")({
  component: Component,
  loader: async () => {
    const changelogs = getChangelogList();
    return { changelogs };
  },
  head: () => ({
    meta: [
      { title: "Changelog - Hyprnote" },
      {
        name: "description",
        content: "Track every update, improvement, and fix to Hyprnote",
      },
      { property: "og:title", content: "Changelog - Hyprnote" },
      {
        property: "og:description",
        content: "Track every update, improvement, and fix to Hyprnote",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/changelog" },
    ],
  }),
});

function Component() {
  const { changelogs } = Route.useLoaderData();

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-16 lg:py-24">
          <HeroSection />
        </div>
        <div className="mt-16">
          {changelogs.map((changelog, index) => (
            <div key={changelog.slug}>
              <div className="max-w-4xl mx-auto px-6">
                <ChangelogSection changelog={changelog} />
              </div>
              {index < changelogs.length - 1 && (
                <div className="border-b border-neutral-100 my-12" />
              )}
            </div>
          ))}
        </div>
        <div className="px-6 pb-16 lg:pb-24"></div>
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
        Changelog
      </h1>
      <p className="text-lg sm:text-xl text-neutral-600">
        Track every update, improvement, and fix to Hyprnote
      </p>
    </div>
  );
}

function ChangelogSection({ changelog }: { changelog: ChangelogWithMeta }) {
  const currentVersion = semver.parse(changelog.version);
  const isPrerelease = currentVersion && currentVersion.prerelease.length > 0;
  const nightlyNumber =
    isPrerelease && currentVersion?.prerelease[0] === "nightly"
      ? currentVersion.prerelease[1]
      : null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-12">
      <div className="md:sticky md:top-24 md:self-start flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          {!isPrerelease && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-linear-to-t from-stone-200 to-stone-100 text-stone-700 rounded-full w-fit">
              <Icon icon="ri:rocket-fill" className="text-xs" />
              Stable
            </span>
          )}
          {isPrerelease && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-linear-to-b from-[#03BCF1] to-[#127FE5] text-white rounded-full">
                <Icon icon="ri:moon-fill" className="text-xs" />
                Beta
              </span>
              {nightlyNumber !== null && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-stone-100 text-stone-600 rounded-full">
                  #{nightlyNumber}
                </span>
              )}
            </div>
          )}
          <Link to="/changelog/$slug/" params={{ slug: changelog.slug }}>
            <h2 className="text-4xl font-mono font-medium text-stone-700 hover:text-stone-900 transition-colors cursor-pointer">
              {currentVersion
                ? `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`
                : changelog.version}
            </h2>
          </Link>
          <time
            className="text-sm text-neutral-500 mt-1"
            dateTime={changelog.date}
          >
            {new Date(changelog.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>

        <DownloadLinks version={changelog.version} />
      </div>

      <div>
        <article className="prose prose-stone prose-sm prose-headings:font-serif prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1 prose-ul:my-2 prose-li:my-0.5 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-headings:no-underline prose-headings:decoration-transparent prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:text-stone-700 prose-img:rounded prose-img:border prose-img:border-neutral-200 prose-img:my-3 max-w-none">
          <MDXContent code={changelog.mdx} components={defaultMDXComponents} />
        </article>

        <Link
          to="/changelog/$slug/"
          params={{ slug: changelog.slug }}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 transition-colors mt-4"
        >
          Read more
          <Icon icon="mdi:arrow-right" className="text-base" />
        </Link>
      </div>
    </section>
  );
}

function DownloadLinks({ version }: { version: string }) {
  const links = getDownloadLinks(version);
  const grouped = groupDownloadLinks(links);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
          <Icon icon="simple-icons:apple" className="text-sm" />
          macOS
        </h3>
        <div className="flex flex-col gap-1.5">
          {grouped.macos.map((link) => (
            <a
              key={link.url}
              href={link.url}
              className={cn([
                "flex items-center gap-2 px-4 h-8 text-sm rounded-full transition-all",
                "bg-linear-to-b from-white to-stone-50 text-neutral-700",
                "border border-neutral-300",
                "hover:shadow-xs hover:scale-[102%] active:scale-[98%]",
              ])}
            >
              <Download className="size-3.5 shrink-0" />
              <span className="truncate">{link.label}</span>
            </a>
          ))}
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
          <Icon icon="simple-icons:linux" className="text-sm" />
          Linux
        </h3>
        <div className="flex flex-col gap-1.5">
          {grouped.linux.map((link) => (
            <a
              key={link.url}
              href={link.url}
              className={cn([
                "flex items-center gap-2 px-4 h-8 text-sm rounded-full transition-all",
                "bg-linear-to-b from-white to-stone-50 text-neutral-700",
                "border border-neutral-300",
                "hover:shadow-xs hover:scale-[102%] active:scale-[98%]",
              ])}
            >
              <Download className="size-3.5 shrink-0" />
              <span className="truncate">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
