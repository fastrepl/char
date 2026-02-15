import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/product/extensions")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Extensions - Char" },
      {
        name: "description",
        content:
          "Connect Char with your favorite tools and build custom integrations with our API. Extensions coming soon.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  const extensionAreas = [
    {
      label: "Custom Views",
      description: "Graph views, kanban boards, and more",
    },
    { label: "Themes", description: "Personalize your workspace" },
    {
      label: "Editor Plugins",
      description: "Enhanced editing capabilities",
    },
    { label: "Integrations", description: "Connect external tools" },
    { label: "Data Sources", description: "Import from anywhere" },
    { label: "Export Formats", description: "Share in any format" },
  ];

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white h-[calc(100vh-65px)]"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white h-full">
        <div className="bg-[linear-gradient(to_bottom,rgba(245,245,244,0.2),white_50%,rgba(245,245,244,0.3))] px-6 h-full flex items-center justify-center">
          <div className="text-center max-w-4xl mx-auto py-12">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
              Build Beyond the Defaults
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-10">
              Extend Char with custom themes, plugins, and views. Build together
              with the community.
            </p>

            <div className="mb-10">
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {extensionAreas.map((area) => (
                  <div
                    key={area.label}
                    className="px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-stone-600 text-xs font-medium"
                  >
                    {area.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <button
                disabled
                className={cn([
                  "inline-block px-8 py-3 text-base font-medium cursor-not-allowed",
                  "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs",
                ])}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
