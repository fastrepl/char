import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allIntegrations } from "content-collections";
import { useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { GitHubOpenSource } from "@/components/github-open-source";
import { SlashSeparator } from "@/components/slash-separator";
import {
  CoolStuffSection,
  CTASection,
  HowItWorksSection,
  MainFeaturesSection,
  TemplatesSection,
} from "@/routes/_view/index";

export const Route = createFileRoute("/_view/integrations/$category/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const doc = allIntegrations.find(
      (doc) => doc.category === params.category && doc.slug === params.slug,
    );
    if (!doc) {
      throw notFound();
    }

    return { doc };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.doc) {
      return { meta: [] };
    }

    const { doc } = loaderData;
    const metaTitle = `${doc.platform} ${doc.slug.charAt(0).toUpperCase() + doc.slug.slice(1).replace(/-/g, " ")} - Char`;

    return {
      meta: [
        { title: metaTitle },
        { name: "description", content: doc.metaDescription },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: metaTitle },
        { property: "og:description", content: doc.metaDescription },
        { property: "og:type", content: "website" },
        {
          property: "og:url",
          content: `https://char.com/integrations/${doc.category}/${doc.slug}`,
        },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: metaTitle },
        { name: "twitter:description", content: doc.metaDescription },
      ],
    };
  },
});

function Component() {
  const { doc } = Route.useLoaderData();
  const [selectedFeature, setSelectedFeature] = useState(0);
  const featuresScrollRef = useRef<HTMLDivElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const scrollToFeature = (index: number) => {
    setSelectedFeature(index);
    if (featuresScrollRef.current) {
      const container = featuresScrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection
          platformIcon={doc.icon}
          platformName={doc.platform}
          headline={doc.headline}
          description={doc.description}
          features={doc.features}
        />
        <SlashSeparator />
        <HowItWorksSection />
        <SlashSeparator />
        <CoolStuffSection />
        <SlashSeparator />
        <MainFeaturesSection
          featuresScrollRef={featuresScrollRef}
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
          scrollToFeature={scrollToFeature}
        />
        <SlashSeparator />
        <TemplatesSection />
        <SlashSeparator />
        <GitHubOpenSource />
        <SlashSeparator />
        <CTASection heroInputRef={heroInputRef} />
      </div>
    </div>
  );
}

function HeroSection({
  platformIcon,
  platformName,
  headline,
  description,
  features,
}: {
  platformIcon: string;
  platformName: string;
  headline: string;
  description: string;
  features?: string[];
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-12">
          <div className="size-32 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[36px] bg-white">
            <img
              src={platformIcon}
              alt={platformName}
              className="size-24 rounded-[28px]"
            />
          </div>
          <div className="text-2xl sm:text-3xl text-neutral-400 font-light px-6">
            +
          </div>
          <div className="size-32 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[36px] bg-white">
            <img
              src="/api/images/hyprnote/icon.png"
              alt="Char"
              className="size-24 rounded-[28px]"
            />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          {headline}
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 mb-8">
          {description}
        </p>

        {features && features.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {features.map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-full text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            to="/download/"
            className={cn([
              "inline-block px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform",
            ])}
          >
            Download Char for free
          </Link>
        </div>
      </header>
    </div>
  );
}
