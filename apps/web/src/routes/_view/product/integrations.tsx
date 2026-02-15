import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";

export const Route = createFileRoute("/_view/product/integrations")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Integrations & Workflows - Char" },
      {
        name: "description",
        content:
          "Connect Char with your favorite tools and automate your meeting workflow. Integrations coming soon.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const integrations = [
  { name: "Slack", image: "slack.jpg" },
  { name: "Linear", image: "linear.jpg" },
  { name: "Notion", image: "notion.jpg" },
  { name: "Salesforce", image: "salesforce.jpg" },
  { name: "Affinity", image: "affinity.jpg" },
  { name: "Attio", image: "attio.jpg" },
  { name: "Google Calendar", image: "gcal.jpg" },
  { name: "Gmail", image: "gmail.jpg" },
  { name: "HubSpot", image: "hubspot.jpg" },
  { name: "Jira", image: "jira.jpg" },
  { name: "Obsidian", image: "obsidian.png" },
];

function IntegrationIcon({
  integration,
}: {
  integration: { name: string; image: string };
}) {
  return (
    <div className="size-20 rounded-xl overflow-hidden border border-neutral-100/50 bg-white shrink-0 hover:scale-110 hover:border-neutral-400 transition-all shadow-xs">
      <Image
        src={`/api/images/icons/${integration.image}`}
        alt={integration.name}
        width={80}
        height={80}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function IntegrationsGrid() {
  const rows = 10;
  const cols = 16;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 flex flex-col justify-center gap-2 opacity-50 px-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 justify-center">
            {Array.from({ length: cols }).map((_, colIndex) => {
              const index = (rowIndex * cols + colIndex) % integrations.length;
              const integration = integrations[index];
              const delay = Math.random() * 3;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="pointer-events-auto animate-fade-in-out"
                  style={{
                    animationDelay: `${delay}s`,
                    animationDuration: "3s",
                  }}
                >
                  <IntegrationIcon integration={integration} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white h-[calc(100vh-65px)] relative overflow-hidden"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white h-full relative">
        <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 relative overflow-hidden h-full">
          <IntegrationsGrid />
          <div className="px-6 h-full flex items-center justify-center relative z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_800px_400px_at_50%_50%,white_0%,rgba(255,255,255,0.8)_40%,transparent_70%)] pointer-events-none" />
            <div className="text-center max-w-4xl mx-auto relative">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-600 mb-6">
                Integrations & Workflows
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
                Connect Char with your favorite tools. Automate repetitive tasks
                with powerful workflows. No coding required.
              </p>
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
    </div>
  );
}
