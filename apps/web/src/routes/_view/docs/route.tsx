import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { SidebarNavigation } from "@/components/sidebar-navigation";

import { getDocsBySection } from "./-structure";

export const Route = createFileRoute("/_view/docs")({
  component: Component,
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <LeftSidebar />
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <Outlet />
      </div>
    </div>
  );
}

function LeftSidebar() {
  const [isOpen, setIsOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 1400,
  );
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1400px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsOpen(true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: "/docs/$/", fuzzy: true });

  const currentSlug = (
    match && typeof match !== "boolean"
      ? (match._splat as string)?.replace(/\/$/, "")
      : undefined
  ) as string | undefined;

  const { sections } = getDocsBySection();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (window.innerWidth > 1400) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      className="fixed left-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex h-[80vh] drop-shadow-lg"
      initial={false}
      animate={{ x: isOpen ? 0 : -256 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <div className="w-64 h-full bg-white/95 backdrop-blur-sm border border-l-0 border-neutral-200 rounded-r-2xl overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto scrollbar-hide px-4 py-6"
        >
          <SidebarNavigation
            sections={sections}
            currentSlug={currentSlug}
            onLinkClick={() => {
              if (window.innerWidth <= 1400) setIsOpen(false);
            }}
            scrollContainerRef={scrollContainerRef}
            linkTo="/docs/$/"
          />
        </div>
      </div>
      <motion.div
        className="self-center -ml-px"
        animate={{ opacity: isOpen ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={cn([
            "flex items-center justify-center",
            "w-7 h-20 rounded-r-xl",
            "bg-white/95 backdrop-blur-sm border border-l-0 border-neutral-200",
            "text-neutral-400 hover:text-neutral-600",
            "cursor-pointer transition-colors",
          ])}
        >
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path
              d="M5 3L9.5 7L5 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </div>
      </motion.div>
    </motion.div>
  );
}
