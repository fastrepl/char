import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  History,
  LayoutTemplate,
  Map,
  Menu,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { SearchTrigger } from "@/components/search";
import { useBlogToc } from "@/hooks/use-blog-toc";
import { useDocsDrawer } from "@/hooks/use-docs-drawer";
import { useHandbookDrawer } from "@/hooks/use-handbook-drawer";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";

function scrollToHero() {
  const heroElement = document.getElementById("hero");
  if (heroElement) {
    heroElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getMaxWidthClass(pathname: string): string {
  const isBlogOrDocs =
    pathname.startsWith("/blog") || pathname.startsWith("/docs");
  return isBlogOrDocs ? "max-w-6xl" : "max-w-6xl";
}

const featuresList = [
  { to: "/product/ai-notetaking", label: "AI Notetaking" },
  { to: "/product/search", label: "Searchable Notes" },
  { to: "/gallery?type=template", label: "Custom Templates" },
  { to: "/product/markdown", label: "Markdown Files" },
  { to: "/product/flexible-ai", label: "Flexible AI" },
  { to: "/opensource", label: "Open Source" },
];

const solutionsList = [
  { to: "/solution/knowledge-workers", label: "For Knowledge Workers" },
  { to: "/enterprise", label: "For Enterprises" },
  { to: "/product/api", label: "For Developers" },
];

const resourcesList: {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}[] = [
  { to: "/blog/", label: "Blog", icon: FileText },
  { to: "/docs/", label: "Documentation", icon: BookOpen },
  {
    to: "/gallery?type=template",
    label: "Meeting Templates",
    icon: LayoutTemplate,
  },
  { to: "/changelog/", label: "Changelog", icon: History },
  { to: "/roadmap/", label: "Roadmap", icon: Map },
  { to: "/company-handbook/", label: "Company Handbook", icon: Building2 },
  {
    to: "https://discord.gg/char",
    label: "Community",
    icon: MessageCircle,
    external: true,
  },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showMobileHeader, setShowMobileHeader] = useState(true);
  const platform = usePlatform();
  const platformCTA = getPlatformCTA(platform);
  const router = useRouterState();
  const maxWidthClass = getMaxWidthClass(router.location.pathname);
  const isDocsPage = router.location.pathname.startsWith("/docs");
  const isHandbookPage =
    router.location.pathname.startsWith("/company-handbook");
  const isBlogArticlePage =
    router.location.pathname.startsWith("/blog/") &&
    router.location.pathname !== "/blog/";
  const docsDrawer = useDocsDrawer();
  const handbookDrawer = useHandbookDrawer();
  const blogToc = useBlogToc();
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!isDocsPage && !isHandbookPage) {
      return;
    }

    const handleScroll = () => {
      if (window.innerWidth >= 768) {
        return;
      }

      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowMobileHeader(true);
      } else if (currentScrollY > lastScrollY.current) {
        setShowMobileHeader(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowMobileHeader(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDocsPage, isHandbookPage]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xs border-b border-neutral-100 z-50 max-md:transition-transform max-md:duration-300 ${
          showMobileHeader ? "max-md:translate-y-0" : "max-md:-translate-y-full"
        }`}
      >
        <div
          className={`${maxWidthClass} mx-auto px-4 laptop:px-0 border-x border-neutral-100 h-17.25`}
        >
          <div className="flex items-center justify-between h-full">
            <LeftNav
              isDocsPage={isDocsPage}
              isHandbookPage={isHandbookPage}
              docsDrawer={docsDrawer}
              handbookDrawer={handbookDrawer}
              setIsMenuOpen={setIsMenuOpen}
              isProductOpen={isProductOpen}
              setIsProductOpen={setIsProductOpen}
              isResourcesOpen={isResourcesOpen}
              setIsResourcesOpen={setIsResourcesOpen}
            />
            <DesktopNav platformCTA={platformCTA} />
            <MobileNav
              platform={platform}
              platformCTA={platformCTA}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              docsDrawer={docsDrawer}
              handbookDrawer={handbookDrawer}
              isDocsPage={isDocsPage}
              isHandbookPage={isHandbookPage}
            />
          </div>
        </div>
        {(isDocsPage || isHandbookPage) && (
          <div
            className={`${maxWidthClass} mx-auto px-4 border-x border-neutral-100 py-2 md:hidden`}
          >
            <SearchTrigger variant="mobile" />
          </div>
        )}
        {isBlogArticlePage && blogToc && blogToc.toc.length > 0 && (
          <BlogTocSubBar blogToc={blogToc} maxWidthClass={maxWidthClass} />
        )}
      </header>

      {/* Spacer to account for fixed header */}
      <div
        className={
          isDocsPage || isHandbookPage
            ? "h-17.25 md:h-17.25 max-md:h-[calc(69px+52px)]"
            : isBlogArticlePage && blogToc && blogToc.toc.length > 0
              ? "h-[calc(69px+44px)] sm:h-17.25"
              : "h-17.25"
        }
      />

      <MobileMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isProductOpen={isProductOpen}
        setIsProductOpen={setIsProductOpen}
        isResourcesOpen={isResourcesOpen}
        setIsResourcesOpen={setIsResourcesOpen}
        platform={platform}
        platformCTA={platformCTA}
        maxWidthClass={maxWidthClass}
      />
    </>
  );
}

function LeftNav({
  isDocsPage,
  isHandbookPage,
  docsDrawer,
  handbookDrawer,
  setIsMenuOpen,
  isProductOpen,
  setIsProductOpen,
  isResourcesOpen,
  setIsResourcesOpen,
}: {
  isDocsPage: boolean;
  isHandbookPage: boolean;
  docsDrawer: ReturnType<typeof useDocsDrawer>;
  handbookDrawer: ReturnType<typeof useHandbookDrawer>;
  setIsMenuOpen: (open: boolean) => void;
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  isResourcesOpen: boolean;
  setIsResourcesOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <DrawerButton
        isDocsPage={isDocsPage}
        isHandbookPage={isHandbookPage}
        docsDrawer={docsDrawer}
        handbookDrawer={handbookDrawer}
        setIsMenuOpen={setIsMenuOpen}
      />
      <Logo />
      <Link
        to="/why-char/"
        className="hidden md:block text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
      >
        Why Char
      </Link>
      <ProductDropdown
        isProductOpen={isProductOpen}
        setIsProductOpen={setIsProductOpen}
      />
      <ResourcesDropdown
        isResourcesOpen={isResourcesOpen}
        setIsResourcesOpen={setIsResourcesOpen}
      />
      <NavLinks />
    </div>
  );
}

function DrawerButton({
  isDocsPage,
  isHandbookPage,
  docsDrawer,
  handbookDrawer,
  setIsMenuOpen,
}: {
  isDocsPage: boolean;
  isHandbookPage: boolean;
  docsDrawer: ReturnType<typeof useDocsDrawer>;
  handbookDrawer: ReturnType<typeof useHandbookDrawer>;
  setIsMenuOpen: (open: boolean) => void;
}) {
  if (isDocsPage && docsDrawer) {
    return (
      <button
        onClick={() => {
          if (!docsDrawer.isOpen) {
            setIsMenuOpen(false);
          }
          docsDrawer.setIsOpen(!docsDrawer.isOpen);
        }}
        className="cursor-pointer md:hidden px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        aria-label={
          docsDrawer.isOpen ? "Close docs navigation" : "Open docs navigation"
        }
      >
        {docsDrawer.isOpen ? (
          <PanelLeftClose className="text-neutral-600" size={16} />
        ) : (
          <PanelLeft className="text-neutral-600" size={16} />
        )}
      </button>
    );
  }

  if (isHandbookPage && handbookDrawer) {
    return (
      <button
        onClick={() => {
          if (!handbookDrawer.isOpen) {
            setIsMenuOpen(false);
          }
          handbookDrawer.setIsOpen(!handbookDrawer.isOpen);
        }}
        className="cursor-pointer md:hidden px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        aria-label={
          handbookDrawer.isOpen
            ? "Close handbook navigation"
            : "Open handbook navigation"
        }
      >
        {handbookDrawer.isOpen ? (
          <PanelLeftClose className="text-neutral-600" size={16} />
        ) : (
          <PanelLeft className="text-neutral-600" size={16} />
        )}
      </button>
    );
  }

  return null;
}

function Logo() {
  return (
    <Link
      to="/"
      className="font-semibold text-2xl font-serif hover:scale-105 transition-transform mr-4"
    >
      Char
    </Link>
  );
}

function ProductDropdown({
  isProductOpen,
  setIsProductOpen,
}: {
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
}) {
  return (
    <div
      className="relative hidden sm:block"
      onMouseEnter={() => setIsProductOpen(true)}
      onMouseLeave={() => setIsProductOpen(false)}
    >
      <button className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-800 transition-all py-2">
        Product
        {isProductOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isProductOpen && (
        <div className="absolute top-full left-0 pt-2 w-150 z-50">
          <div className="bg-white border border-neutral-200 rounded-xs shadow-lg py-2">
            <div className="px-3 py-2 grid grid-cols-2 gap-x-6">
              <FeaturesList onClose={() => setIsProductOpen(false)} />
              <SolutionsList onClose={() => setIsProductOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturesList({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Features
      </div>
      {featuresList.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClose}
          className="py-2 text-sm text-neutral-700 flex items-center group"
        >
          <span className="group-hover:underline decoration-dotted">
            {link.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function SolutionsList({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Solutions
      </div>
      {solutionsList.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClose}
          className="py-2 text-sm text-neutral-700 flex items-center group"
        >
          <span className="group-hover:underline decoration-dotted">
            {link.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ResourcesDropdown({
  isResourcesOpen,
  setIsResourcesOpen,
}: {
  isResourcesOpen: boolean;
  setIsResourcesOpen: (open: boolean) => void;
}) {
  return (
    <div
      className="relative hidden sm:block"
      onMouseEnter={() => setIsResourcesOpen(true)}
      onMouseLeave={() => setIsResourcesOpen(false)}
    >
      <button className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-800 transition-all py-2">
        Resources
        {isResourcesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isResourcesOpen && (
        <div className="absolute top-full left-0 pt-2 w-56 z-50">
          <div className="bg-white border border-neutral-200 rounded-xs shadow-lg py-2">
            <div className="px-3 py-2">
              {resourcesList.map((link) =>
                link.external ? (
                  <a
                    key={link.to}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsResourcesOpen(false)}
                    className="py-2 text-sm text-neutral-700 flex items-center gap-2 group"
                  >
                    <link.icon size={16} className="text-neutral-400" />
                    <span className="group-hover:underline decoration-dotted">
                      {link.label}
                    </span>
                  </a>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsResourcesOpen(false)}
                    className="py-2 text-sm text-neutral-700 flex items-center gap-2 group"
                  >
                    <link.icon size={16} className="text-neutral-400" />
                    <span className="group-hover:underline decoration-dotted">
                      {link.label}
                    </span>
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLinks() {
  return (
    <Link
      to="/pricing/"
      className="hidden sm:block text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
    >
      Pricing
    </Link>
  );
}

function DesktopNav({
  platformCTA,
}: {
  platformCTA: ReturnType<typeof getPlatformCTA>;
}) {
  return (
    <nav className="hidden sm:flex items-center gap-4">
      <SearchTrigger variant="header" />
      <CTAButton platformCTA={platformCTA} />
    </nav>
  );
}

function MobileNav({
  platform,
  platformCTA,
  isMenuOpen,
  setIsMenuOpen,
  docsDrawer,
  handbookDrawer,
  isDocsPage,
  isHandbookPage,
}: {
  platform: string;
  platformCTA: ReturnType<typeof getPlatformCTA>;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  docsDrawer: ReturnType<typeof useDocsDrawer>;
  handbookDrawer: ReturnType<typeof useHandbookDrawer>;
  isDocsPage: boolean;
  isHandbookPage: boolean;
}) {
  const hideCTA = isDocsPage || isHandbookPage;

  return (
    <div className="sm:hidden flex items-center gap-3">
      {!hideCTA && (
        <div
          className={cn("transition-opacity duration-200 ease-out", [
            isMenuOpen ? "opacity-0" : "opacity-100",
          ])}
        >
          <CTAButton platformCTA={platformCTA} platform={platform} mobile />
        </div>
      )}
      <button
        onClick={() => {
          if (!isMenuOpen) {
            if (docsDrawer) {
              docsDrawer.setIsOpen(false);
            }
            if (handbookDrawer) {
              handbookDrawer.setIsOpen(false);
            }
          }
          setIsMenuOpen(!isMenuOpen);
        }}
        className="cursor-pointer px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? (
          <X className="text-neutral-600" size={16} />
        ) : (
          <Menu className="text-neutral-600" size={16} />
        )}
      </button>
    </div>
  );
}

function CTAButton({
  platformCTA,
  platform,
  mobile = false,
}: {
  platformCTA: ReturnType<typeof getPlatformCTA>;
  platform?: string;
  mobile?: boolean;
}) {
  const baseClass = mobile
    ? "px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
    : "px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all";

  if (mobile && platform === "mobile") {
    return (
      <Link to="/" hash="hero" onClick={scrollToHero} className={baseClass}>
        Get reminder
      </Link>
    );
  }

  if (platformCTA.action === "download") {
    return (
      <a href="/download/apple-silicon" download className={baseClass}>
        {platformCTA.label}
      </a>
    );
  }

  return (
    <Link to="/" hash="hero" onClick={scrollToHero} className={baseClass}>
      {platformCTA.label}
    </Link>
  );
}

function MobileMenu({
  isMenuOpen,
  setIsMenuOpen,
  isProductOpen,
  setIsProductOpen,
  isResourcesOpen,
  setIsResourcesOpen,
  platform,
  platformCTA,
  maxWidthClass,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  isResourcesOpen: boolean;
  setIsResourcesOpen: (open: boolean) => void;
  platform: string;
  platformCTA: ReturnType<typeof getPlatformCTA>;
  maxWidthClass: string;
}) {
  if (!isMenuOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 sm:hidden"
        onClick={() => setIsMenuOpen(false)}
      />
      <div className="fixed top-17.25 left-0 right-0 bg-white/80 backdrop-blur-xs border-b border-neutral-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] z-50 sm:hidden animate-in slide-in-from-top duration-300 max-h-[calc(100vh-69px)] overflow-y-auto">
        <nav className={`${maxWidthClass} mx-auto px-4 py-6`}>
          <div className="flex flex-col gap-6">
            <MobileMenuLinks
              isProductOpen={isProductOpen}
              setIsProductOpen={setIsProductOpen}
              isResourcesOpen={isResourcesOpen}
              setIsResourcesOpen={setIsResourcesOpen}
              setIsMenuOpen={setIsMenuOpen}
            />
            <MobileMenuCTAs
              platform={platform}
              platformCTA={platformCTA}
              setIsMenuOpen={setIsMenuOpen}
            />
          </div>
        </nav>
      </div>
    </>
  );
}

function MobileMenuLinks({
  isProductOpen,
  setIsProductOpen,
  isResourcesOpen,
  setIsResourcesOpen,
  setIsMenuOpen,
}: {
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  isResourcesOpen: boolean;
  setIsResourcesOpen: (open: boolean) => void;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/why-char/"
        onClick={() => setIsMenuOpen(false)}
        className="block text-base text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        Why Char
      </Link>
      <MobileProductSection
        isProductOpen={isProductOpen}
        setIsProductOpen={setIsProductOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      <MobileResourcesSection
        isResourcesOpen={isResourcesOpen}
        setIsResourcesOpen={setIsResourcesOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      <Link
        to="/pricing/"
        onClick={() => setIsMenuOpen(false)}
        className="block text-base text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        Pricing
      </Link>
    </div>
  );
}

function MobileProductSection({
  isProductOpen,
  setIsProductOpen,
  setIsMenuOpen,
}: {
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div>
      <button
        onClick={() => setIsProductOpen(!isProductOpen)}
        className="flex items-center justify-between w-full text-base text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        <span>Product</span>
        {isProductOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isProductOpen && (
        <div className="mt-3 ml-4 flex flex-col gap-4 border-l-2 border-neutral-200 pl-4">
          <MobileFeaturesList setIsMenuOpen={setIsMenuOpen} />
          <MobileSolutionsList setIsMenuOpen={setIsMenuOpen} />
        </div>
      )}
    </div>
  );
}

function MobileResourcesSection({
  isResourcesOpen,
  setIsResourcesOpen,
  setIsMenuOpen,
}: {
  isResourcesOpen: boolean;
  setIsResourcesOpen: (open: boolean) => void;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div>
      <button
        onClick={() => setIsResourcesOpen(!isResourcesOpen)}
        className="flex items-center justify-between w-full text-base text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        <span>Resources</span>
        {isResourcesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isResourcesOpen && (
        <div className="mt-3 ml-4 flex flex-col gap-2 border-l-2 border-neutral-200 pl-4">
          {resourcesList.map((link) =>
            link.external ? (
              <a
                key={link.to}
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors py-1 flex items-center gap-2"
              >
                <link.icon size={14} className="text-neutral-400" />
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors py-1 flex items-center gap-2"
              >
                <link.icon size={14} className="text-neutral-400" />
                {link.label}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function MobileFeaturesList({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Features
      </div>
      <div className="flex flex-col gap-2 pb-4">
        {featuresList.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setIsMenuOpen(false)}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors py-1"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileSolutionsList({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Solutions
      </div>
      <div className="flex flex-col gap-2">
        {solutionsList.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setIsMenuOpen(false)}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors py-1"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function BlogTocSubBar({
  blogToc,
  maxWidthClass,
}: {
  blogToc: NonNullable<ReturnType<typeof useBlogToc>>;
  maxWidthClass: string;
}) {
  const { toc, activeId, scrollToHeading } = blogToc;
  const activeIndex = toc.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? toc[activeIndex] : toc[0];

  const goPrev = () => {
    const prevIndex = Math.max(0, activeIndex - 1);
    scrollToHeading(toc[prevIndex].id);
  };

  const goNext = () => {
    const nextIndex = Math.min(toc.length - 1, activeIndex + 1);
    scrollToHeading(toc[nextIndex].id);
  };

  return (
    <div
      className={`${maxWidthClass} mx-auto border-x border-neutral-100 border-t border-t-neutral-50 sm:hidden`}
    >
      <div className="flex items-center h-11 px-2">
        <button
          onClick={goPrev}
          disabled={activeIndex <= 0}
          className={cn([
            "shrink-0 p-1.5 rounded-md transition-colors cursor-pointer",
            activeIndex <= 0
              ? "text-neutral-200"
              : "text-neutral-500 hover:text-stone-700 hover:bg-stone-50",
          ])}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => {
            if (activeItem) scrollToHeading(activeItem.id);
          }}
          className="flex-1 min-w-0 px-2 cursor-pointer"
        >
          <p className="text-sm text-stone-700 font-medium truncate text-center">
            {activeItem?.text}
          </p>
        </button>
        <button
          onClick={goNext}
          disabled={activeIndex >= toc.length - 1}
          className={cn([
            "shrink-0 p-1.5 rounded-md transition-colors cursor-pointer",
            activeIndex >= toc.length - 1
              ? "text-neutral-200"
              : "text-neutral-500 hover:text-stone-700 hover:bg-stone-50",
          ])}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function MobileMenuCTAs({
  platform,
  platformCTA,
  setIsMenuOpen,
}: {
  platform: string;
  platformCTA: ReturnType<typeof getPlatformCTA>;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-row sticky bottom-4 gap-3">
      <Link
        to="/auth/"
        onClick={() => setIsMenuOpen(false)}
        className="block w-full px-4 py-3 text-center text-sm text-neutral-700 border border-neutral-200 bg-white rounded-lg hover:bg-neutral-50 transition-colors"
      >
        Get started
      </Link>
      {platform === "mobile" ? (
        <Link
          to="/"
          hash="hero"
          onClick={() => {
            setIsMenuOpen(false);
            scrollToHero();
          }}
          className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
        >
          Get reminder
        </Link>
      ) : platformCTA.action === "download" ? (
        <a
          href="/download/apple-silicon"
          download
          onClick={() => setIsMenuOpen(false)}
          className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
        >
          {platformCTA.label}
        </a>
      ) : (
        <Link
          to="/"
          hash="hero"
          onClick={() => {
            setIsMenuOpen(false);
            scrollToHero();
          }}
          className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
        >
          {platformCTA.label}
        </Link>
      )}
    </div>
  );
}
