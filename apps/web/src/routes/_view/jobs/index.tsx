import { createFileRoute, Link } from "@tanstack/react-router";
import { allJobs } from "content-collections";
import { ArrowRight } from "lucide-react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/jobs/")({
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Jobs - Char" },
      {
        name: "description",
        content: "Join the Char team. View open positions and apply.",
      },
    ],
  }),
});

function JobsPage() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <JobsSection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="px-6 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          Jobs
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Join us in building the future of note-taking. We're a small team with
          big ambitions.
        </p>
      </div>
    </div>
  );
}

function JobsSection() {
  const jobs = allJobs.filter(
    (j) => import.meta.env.DEV || j.published !== false,
  );

  return (
    <section className="pb-16 lg:pb-24">
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2">
          {jobs.map((job, index) => (
            <JobCard key={job.slug} job={job} hasBorder={index === 0} />
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <p className="text-lg text-neutral-500">
            There are no open positions at the moment.
          </p>
        </div>
      )}
      <SlashSeparator />
      <CTASection />
    </section>
  );
}

function JobCard({
  job,
  hasBorder,
}: {
  job: (typeof allJobs)[0];
  hasBorder?: boolean;
}) {
  return (
    <Link
      to="/jobs/$slug/"
      params={{ slug: job.slug }}
      className={cn([
        "p-8 text-left relative overflow-hidden block group",
        "hover:bg-stone-50/50 transition-colors",
        hasBorder && "border-b md:border-b-0 md:border-r border-neutral-100",
      ])}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${job.backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-white/95 via-white/90 to-white/95" />
      <div className="relative z-10 h-full flex flex-col">
        <h2 className="text-xl font-medium text-stone-600 mb-2">{job.title}</h2>
        <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
          <span>Full-time</span>
          <span className="text-neutral-300">|</span>
          <span>Remote</span>
        </div>
        <p className="text-neutral-600 leading-relaxed mb-6">
          {job.cardDescription}
        </p>
        <div className="mt-auto">
          <span className="inline-flex items-center gap-2 px-4 h-8 bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs group-hover:shadow-md group-hover:scale-[102%] group-active:scale-[98%] transition-all text-sm font-medium">
            Interested?
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Char"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Don't see a role that fits?
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          We'd still love to hear from you!
        </p>
        <div className="pt-6">
          <a
            href="mailto:founders@char.com"
            className="px-6 h-12 flex items-center justify-center text-base sm:text-lg bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Contact us
          </a>
        </div>
      </div>
    </section>
  );
}
