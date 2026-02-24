import { MDXContent } from "@content-collections/mdx/react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { allJobs } from "content-collections";
import { Children, isValidElement, type ReactNode } from "react";

import { AnimatedTitle } from "@/components/animated-title";
import { Image } from "@/components/image";
import { MDXLink } from "@/components/mdx";
import { jobsMdxComponents } from "@/components/mdx-jobs";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/jobs/$slug")({
  component: JobPage,
  loader: async ({ params }) => {
    const job = allJobs.find((j) => j.slug === params.slug);
    if (!job) {
      throw notFound();
    }
    if (!import.meta.env.DEV && job.published === false) {
      throw notFound();
    }
    return { job };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.job) {
      return { meta: [] };
    }

    const { job } = loaderData;

    const ogParams = new URLSearchParams({
      type: "jobs",
      title: job.title,
      backgroundImage: job.backgroundImage,
    });
    if (job.description) {
      ogParams.set("description", job.description);
    }
    const ogImageUrl = `/og?${ogParams.toString()}`;

    return {
      meta: [
        { title: `${job.title} - Hyprnote` },
        { name: "description", content: job.description },
        { property: "og:title", content: `${job.title} - Hyprnote` },
        { property: "og:description", content: job.description },
        { property: "og:image", content: ogImageUrl },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${job.title} - Hyprnote` },
        { name: "twitter:description", content: job.description },
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
});

function JobPage() {
  const { job } = Route.useLoaderData();

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection job={job} />
        <JobDetailsSection job={job} />
        <SlashSeparator />
        <CTASection job={job} />
      </div>
    </div>
  );
}

function getApplyUrl(job: (typeof allJobs)[0]) {
  return (
    job.applyUrl ||
    `mailto:founders@hyprnote.com?subject=Application for ${job.title}`
  );
}

function HeroSection({ job }: { job: (typeof allJobs)[0] }) {
  return (
    <div className="relative overflow-hidden">
      <Image
        src={job.backgroundImage}
        alt=""
        layout="fullWidth"
        priority={false}
        objectFit="cover"
        className="absolute inset-0 w-full h-full"
      />
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(12px)",
          mask: "linear-gradient(to bottom, transparent 0%, transparent 50%, black 100%)",
          WebkitMask:
            "linear-gradient(to bottom, transparent 0%, transparent 50%, black 100%)",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-white/60 via-white/70 to-white" />
      <div className="relative px-6 py-24 lg:py-40">
        <div className="text-center max-w-3xl mx-auto">
          <AnimatedTitle
            text={job.title.toLowerCase()}
            className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-800 mb-4"
          />
          <p className="flex items-center justify-center gap-3 font-mono text-sm text-neutral-600 mb-8">
            full-time, remote
          </p>
          <a
            href={getApplyUrl(job)}
            className="px-6 h-10 inline-flex items-center justify-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Apply now
          </a>
        </div>
      </div>
    </div>
  );
}

function JobDetailsSection({ job }: { job: (typeof allJobs)[0] }) {
  return (
    <div className="px-4 pb-16 lg:pb-24">
      <div className="max-w-3xl mx-auto">
        <MDXContent
          code={job.mdx}
          components={{
            a: MDXLink,
            h2: ({ children }) => (
              <h2 className="text-lg font-serif tracking-widest uppercase text-neutral-400 mb-6 mt-12 first:mt-0">
                {stripLinks(children)}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold text-neutral-700 mt-6 mb-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-neutral-600 mb-4">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-2 text-neutral-600 mb-4 [&_ul]:mt-2 [&_ul]:mb-0">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-2 text-neutral-600 mb-4 [&_ol]:mt-2 [&_ol]:mb-0">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            ...jobsMdxComponents,
          }}
        />
      </div>
    </div>
  );
}

function stripLinks(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }
    const props = child.props as { href?: string; children?: ReactNode };
    if (child.type === "a" || props.href) {
      return stripLinks(props.children);
    }
    return child;
  });
}

function CTASection({ job }: { job: (typeof allJobs)[0] }) {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
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
        <h2 className="text-2xl sm:text-3xl font-serif">Interested?</h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          We'd love to hear from you.
        </p>
        <div className="pt-6">
          <a
            href={getApplyUrl(job)}
            className="px-6 h-12 flex items-center justify-center text-base sm:text-lg bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Apply now
          </a>
        </div>
      </div>
    </section>
  );
}
