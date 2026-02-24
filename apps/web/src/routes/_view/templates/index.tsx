import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { allTemplates } from "content-collections";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { MDXLink } from "@/components/mdx";
import { SlashSeparator } from "@/components/slash-separator";

type TemplatesSearch = {
  category?: string;
};

export const Route = createFileRoute("/_view/templates/")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): TemplatesSearch => {
    return {
      category:
        typeof search.category === "string" ? search.category : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Meeting Templates - Hyprnote Templates" },
      {
        name: "description",
        content:
          "Discover our library of AI meeting templates. Get structured summaries for sprint planning, sales calls, 1:1s, and more. Create custom templates for your workflow.",
      },
      {
        property: "og:title",
        content: "Meeting Templates - Hyprnote Templates",
      },
      {
        property: "og:description",
        content:
          "Browse our collection of AI meeting templates. From engineering standups to sales discovery calls, find the perfect template for your meeting type.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/templates" },
    ],
  }),
});

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof allTemplates)[0] | null
  >(null);

  const selectedCategory = search.category || null;

  const setSelectedCategory = (category: string | null) => {
    navigate({ search: category ? { category } : {}, resetScroll: false });
  };

  const handleTemplateClick = (template: (typeof allTemplates)[0]) => {
    setSelectedTemplate(template);
    window.history.pushState({}, "", `/templates/${template.slug}`);
  };

  const handleModalClose = useCallback(() => {
    setSelectedTemplate(null);
    const url = selectedCategory
      ? `/templates?category=${encodeURIComponent(selectedCategory)}`
      : "/templates";
    window.history.pushState({}, "", url);
  }, [selectedCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTemplate) {
        handleModalClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTemplate, handleModalClose]);

  useEffect(() => {
    if (selectedTemplate) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedTemplate]);

  const templatesByCategory = getTemplatesByCategory();
  const categories = Object.keys(templatesByCategory);

  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    if (selectedCategory) {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query),
      );
    }

    return templates;
  }, [searchQuery, selectedCategory]);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <ContributeBanner />
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <QuoteSection />
        <MobileCategoriesSection
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <TemplatesSection
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          templatesByCategory={templatesByCategory}
          filteredTemplates={filteredTemplates}
          onTemplateClick={handleTemplateClick}
        />
        <SlashSeparator />
        <CTASection />
      </div>

      {selectedTemplate && (
        <TemplateModal template={selectedTemplate} onClose={handleModalClose} />
      )}
    </div>
  );
}

function ContributeBanner() {
  return (
    <a
      href="https://github.com/fastrepl/hyprnote/issues/new?title=Suggest%20New%20Template&body=Title:%20Sprint%20Planning%0ACategory:%20Engineering%0ADescription:%20A%20template%20for%20capturing%20sprint%20planning%20discussions%0A%0AStructure%20(list%20of%20sections%2C%20each%20with%20a%20title%20and%20what%20to%20include):%0A-%20Sprint%20Goals:%20Key%20objectives%20for%20the%20sprint%0A-%20User%20Stories:%20Stories%20discussed%20and%20committed%0A-%20Action%20Items:%20Tasks%20assigned%20to%20team%20members"
      target="_blank"
      rel="noopener noreferrer"
      className={cn([
        "group flex items-center justify-center gap-2 text-center cursor-pointer",
        "bg-stone-50/70 border-b border-stone-100 hover:bg-stone-100/70",
        "py-3 px-4",
        "font-serif text-sm text-stone-700",
        "transition-colors",
      ])}
    >
      Have a template idea? Contribute on{" "}
      <span className="group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-2 items-center inline-flex gap-0.5">
        <Icon
          icon="mdi:github"
          className="text-base inline-block align-middle"
        />{" "}
        GitHub
      </span>
    </a>
  );
}

function HeroSection({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <section className="flex flex-col items-center text-center gap-8 py-24 px-4 laptop:px-0">
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
            Templates
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Different conversations need different approaches. Templates are AI
            instructions that capture best practices for each meeting type —
            plug them in and get structured notes instantly.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="relative flex items-center border-2 border-neutral-200 focus-within:border-stone-500 rounded-full overflow-hidden transition-all duration-200">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm outline-hidden bg-white text-center placeholder:text-center"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function QuoteSection() {
  return (
    <div className="py-4 px-4 text-center border-y border-neutral-100 bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <p className="text-base text-stone-600 font-serif italic">
        "Curated by Hyprnote and the community"
      </p>
    </div>
  );
}

function MobileCategoriesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}) {
  return (
    <div className="lg:hidden border-b border-neutral-100 bg-stone-50">
      <div className="flex overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn([
            "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 cursor-pointer",
            selectedCategory === null
              ? "bg-stone-600 text-white"
              : "text-stone-600 hover:bg-stone-100",
          ])}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn([
              "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 last:border-r-0 cursor-pointer",
              selectedCategory === category
                ? "bg-stone-600 text-white"
                : "text-stone-600 hover:bg-stone-100",
            ])}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplatesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  templatesByCategory,
  filteredTemplates,
  onTemplateClick,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  templatesByCategory: Record<string, typeof allTemplates>;
  filteredTemplates: typeof allTemplates;
  onTemplateClick: (template: (typeof allTemplates)[0]) => void;
}) {
  return (
    <div className="px-6 pt-8 pb-12 lg:pt-12 lg:pb-20">
      <div className="flex gap-8">
        <DesktopSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          templatesByCategory={templatesByCategory}
        />
        <TemplatesGrid
          filteredTemplates={filteredTemplates}
          onTemplateClick={onTemplateClick}
        />
      </div>
    </div>
  );
}

function DesktopSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  templatesByCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  templatesByCategory: Record<string, typeof allTemplates>;
}) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-21.25">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
          Categories
        </h3>
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn([
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              selectedCategory === null
                ? "bg-stone-100 text-stone-800"
                : "text-stone-600 hover:bg-stone-50",
            ])}
          >
            All Templates
            <span className="ml-2 text-xs text-neutral-400">
              ({allTemplates.length})
            </span>
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn([
                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                selectedCategory === category
                  ? "bg-stone-100 text-stone-800"
                  : "text-stone-600 hover:bg-stone-50",
              ])}
            >
              {category}
              <span className="ml-2 text-xs text-neutral-400">
                ({templatesByCategory[category].length})
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function TemplatesGrid({
  filteredTemplates,
  onTemplateClick,
}: {
  filteredTemplates: typeof allTemplates;
  onTemplateClick: (template: (typeof allTemplates)[0]) => void;
}) {
  if (filteredTemplates.length === 0) {
    return (
      <section className="flex-1 min-w-0">
        <div className="text-center py-12">
          <Icon
            icon="mdi:file-search"
            className="text-6xl text-neutral-300 mb-4 mx-auto"
          />
          <p className="text-neutral-600">
            No templates found matching your search.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.slug}
            template={template}
            onClick={() => onTemplateClick(template)}
          />
        ))}
        <ContributeCard />
      </div>
    </section>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: (typeof allTemplates)[0];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group p-4 border border-neutral-200 rounded-xs bg-white hover:shadow-md hover:border-neutral-300 transition-all text-left cursor-pointer flex flex-col items-start"
    >
      <div className="mb-4 w-full">
        <p className="text-xs text-neutral-500 mb-2">
          <span className="font-medium">Template</span>
          <span className="mx-1">/</span>
          <span>{template.category}</span>
        </p>
        <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
          {template.title}
        </h3>
        <p className="text-sm text-neutral-600 line-clamp-2">
          {template.description}
        </p>
      </div>
      <div className="pt-4 border-t border-neutral-100 w-full">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
          For
        </div>
        <div className="text-sm text-stone-600">
          {template.targets.join(", ")}
        </div>
      </div>
    </button>
  );
}

function ContributeCard() {
  return (
    <div className="p-4 border border-dashed border-neutral-300 rounded-xs bg-stone-50/50 flex flex-col items-center justify-center text-center">
      <h3 className="font-serif text-lg text-stone-600 mb-2">
        Contribute a template
      </h3>
      <p className="text-sm text-neutral-500 mb-4">
        Have a template idea? Submit a PR and help the community.
      </p>
      <a
        href="https://github.com/fastrepl/hyprnote/issues/new?title=Suggest%20New%20Template&body=Title:%20Sprint%20Planning%0ACategory:%20Engineering%0ADescription:%20A%20template%20for%20capturing%20sprint%20planning%20discussions%0A%0AStructure%20(list%20of%20sections%2C%20each%20with%20a%20title%20and%20what%20to%20include):%0A-%20Sprint%20Goals:%20Key%20objectives%20for%20the%20sprint%0A-%20User%20Stories:%20Stories%20discussed%20and%20committed%0A-%20Action%20Items:%20Tasks%20assigned%20to%20team%20members"
        target="_blank"
        rel="noopener noreferrer"
        className={cn([
          "group px-4 h-10 inline-flex items-center justify-center gap-2 w-fit",
          "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all cursor-pointer text-sm",
        ])}
      >
        <Icon icon="mdi:github" className="text-base" />
        Submit your idea
      </a>
    </div>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-6 text-center">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
          Ready to transform your meetings?
        </h2>
        <p className="text-lg text-neutral-600">
          Download Hyprnote and start using these templates to capture perfect
          meeting notes with AI.
        </p>
        <div className="flex flex-col items-center gap-4 pt-4">
          <DownloadButton />
          <p className="text-sm text-neutral-500">
            Free to use. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}

function TemplateModal({
  template,
  onClose,
}: {
  template: (typeof allTemplates)[0];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="absolute inset-4 sm:inset-8 lg:inset-16 flex items-start justify-center overflow-y-auto">
        <div
          className={cn([
            "relative w-full max-w-2xl my-8",
            "bg-[url('/api/images/texture/white-leather.png')]",
            "rounded-xs shadow-2xl",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn([
              "absolute inset-0 rounded-xs",
              "bg-[url('/api/images/texture/paper.png')] opacity-30",
            ])}
          />
          <div className="relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-stone-800 transition-colors cursor-pointer z-10"
            >
              <Icon icon="mdi:close" className="text-lg" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="mb-2">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  {template.category}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-stone-700 mb-3">
                {template.title}
              </h2>
              <p className="text-neutral-600 mb-4">{template.description}</p>

              <div className="mb-6">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  For:{" "}
                </span>
                <span className="text-sm text-stone-600">
                  {template.targets.join(", ")}
                </span>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">
                    Template Sections
                  </h3>
                  <div className="flex flex-col gap-3">
                    {template.sections.map((section, index) => (
                      <div
                        key={section.title}
                        className="p-3 rounded-lg bg-white/80 border border-stone-200/50"
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

                <div className="prose prose-stone prose-sm prose-headings:font-serif prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-p:text-neutral-600 prose-p:text-sm max-w-none">
                  <MDXContent code={template.mdx} components={{ a: MDXLink }} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-200/50">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <DownloadButton />
                  <p className="text-sm text-neutral-500 text-center sm:text-left">
                    Download Hyprnote to use this template
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTemplatesByCategory() {
  return allTemplates.reduce(
    (acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, typeof allTemplates>,
  );
}
