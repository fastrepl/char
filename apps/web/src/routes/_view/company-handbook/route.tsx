import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { allHandbooks } from "content-collections";
import { useMemo, useRef } from "react";

import { SidebarNavigation } from "@/components/sidebar-navigation";

import { handbookStructure } from "./-structure";

export const Route = createFileRoute("/_view/company-handbook")({
  component: Component,
});

function Component() {
  return (
    <div className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex gap-8">
          <LeftSidebar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function LeftSidebar() {
  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: "/company-handbook/$/", fuzzy: true });

  const currentSlug = (
    match && typeof match !== "boolean" ? match._splat : undefined
  ) as string | undefined;

  const handbooksBySection = useMemo(() => {
    const sectionGroups: Record<
      string,
      { title: string; docs: (typeof allHandbooks)[0][] }
    > = {};

    allHandbooks.forEach((doc) => {
      if (doc.slug === "index" || doc.isIndex) {
        return;
      }

      const sectionName = doc.section;

      if (!sectionGroups[sectionName]) {
        sectionGroups[sectionName] = {
          title: sectionName,
          docs: [],
        };
      }

      sectionGroups[sectionName].docs.push(doc);
    });

    Object.keys(sectionGroups).forEach((sectionName) => {
      sectionGroups[sectionName].docs.sort((a, b) => a.order - b.order);
    });

    const sections = handbookStructure.sections
      .map((sectionId) => {
        const sectionName = handbookStructure.sectionTitles[sectionId];
        return sectionGroups[sectionName];
      })
      .filter(Boolean);

    return { sections };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div
        ref={scrollContainerRef}
        className="sticky top-17.25 max-h-[calc(100vh-69px)] overflow-y-auto scrollbar-hide flex flex-col gap-6 px-4 py-6"
      >
        <SidebarNavigation
          sections={handbooksBySection.sections}
          currentSlug={currentSlug}
          scrollContainerRef={scrollContainerRef}
          linkTo="/company-handbook/$/"
        />
      </div>
    </aside>
  );
}
