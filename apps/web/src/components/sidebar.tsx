import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@hypr/utils";

import { SearchTrigger } from "@/components/search";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";

function CharLogo({ className }: { className?: string }) {
  return (
    <svg
      width="103"
      height="30"
      viewBox="0 0 103 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7.871 4.147C7.871 5.658 7.082 7.039 6.099 8.214C4.65 9.946 3.77 12.161 3.77 14.575C3.77 16.99 4.65 19.205 6.099 20.937C7.082 22.112 7.871 23.493 7.871 25.004V29.151H2.965V24.319C2.965 22.735 2.165 21.249 0.822 20.34L0 19.783V9.235L0.822 8.678C2.165 7.769 2.965 6.284 2.965 4.699V0L7.871 0V4.147Z"
        fill="currentColor"
      />
      <path
        d="M94.746 4.147C94.746 5.658 95.535 7.039 96.519 8.214C97.967 9.946 98.847 12.161 98.847 14.575C98.847 16.99 97.967 19.205 96.519 20.937C95.535 22.112 94.746 23.493 94.746 25.004V29.151H99.653V24.319C99.653 22.735 100.452 21.249 101.795 20.34L102.617 19.783V9.235L101.795 8.678C100.452 7.769 99.653 6.284 99.653 4.699V0L94.746 0V4.147Z"
        fill="currentColor"
      />
      <path
        d="M90.369 4.536H86.669C84.596 4.536 82.721 5.667 81.73 7.429V4.536H73.026V8.029H78.244V20.821H73.026V24.313H90.311V20.821H82.425V12.447C82.425 10.262 84.191 8.494 86.365 8.494H90.369V4.536Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M60.901 4.071C63.781 4.071 66.142 5.182 67.798 6.995V4.536H71.284V24.313H67.798V21.805C66.128 23.645 63.753 24.778 60.901 24.778C55.064 24.778 51.331 20.074 51.331 14.425C51.331 11.606 52.225 9.021 53.882 7.131C55.546 5.235 57.954 4.071 60.901 4.071ZM61.365 7.912C59.5 7.912 58.023 8.638 57.005 9.793C55.981 10.956 55.396 12.586 55.396 14.425C55.396 18.088 57.776 20.937 61.365 20.937C64.954 20.937 67.334 18.088 67.334 14.425C67.334 12.586 66.749 10.956 65.725 9.793C64.708 8.638 63.231 7.912 61.365 7.912Z"
        fill="currentColor"
      />
      <path
        d="M49.589 12.098C49.589 7.924 46.214 4.536 42.048 4.536H41.195C39.142 4.536 36.977 5.657 35.905 7.463V0H32.188V24.313H36.369V12.447C36.369 11.405 36.912 10.422 37.78 9.684C38.648 8.944 39.793 8.494 40.891 8.494H41.06C43.345 8.494 45.407 10.359 45.407 12.564V24.313H49.589V12.098Z"
        fill="currentColor"
      />
      <path
        d="M26.243 17.328C25.77 19.561 23.754 21.053 20.995 21.053C17.296 21.053 14.852 18.146 14.852 14.425C14.852 12.556 15.453 10.897 16.506 9.713C17.552 8.536 19.074 7.796 20.995 7.796C23.793 7.796 25.772 9.443 26.26 11.533L26.365 11.983H30.559L30.436 11.297C29.689 7.153 26.043 4.071 20.995 4.071C17.864 4.071 15.3 5.224 13.522 7.117C11.749 9.005 10.787 11.595 10.787 14.425C10.787 20.113 14.807 24.778 20.995 24.778C25.907 24.778 29.753 22.074 30.427 17.535L30.527 16.866H26.341L26.243 17.328Z"
        fill="currentColor"
      />
    </svg>
  );
}

const navLinks = [
  { to: "/why-char/", label: "Why Char" },
  { to: "/product/ai-notetaking", label: "Product" },
  { to: "/docs/", label: "Resources" },
  { to: "/pricing/", label: "Pricing" },
];

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouterState();
  const platform = usePlatform();
  const platformCTA = getPlatformCTA(platform);
  const pathname = router.location.pathname;

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <>
      <MobileTopBar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          ["hidden w-[200px] shrink-0 md:block"],
          ["sticky top-0 h-dvh self-start"],
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto bg-neutral-950">
          <div className="px-12 pt-16 pb-10">
            <Link to="/">
              <CharLogo className="h-7 w-auto text-neutral-500 transition-colors hover:text-neutral-300" />
            </Link>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-12">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  ["py-2.5 text-base transition-colors"],
                  [
                    pathname.startsWith(link.to.replace(/\/$/, ""))
                      ? "text-neutral-200"
                      : "text-neutral-500 hover:text-neutral-300",
                  ],
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 px-12 pb-8">
            <div className="flex flex-col gap-3">
              <SearchTrigger variant="header" />
              <SidebarCTA platformCTA={platformCTA} />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile slide-out sidebar */}
      <aside
        className={cn(
          [
            "fixed top-14 left-0 z-50 flex h-[calc(100dvh-56px)] w-[200px] flex-col bg-neutral-950 md:hidden",
            "border-r border-neutral-800 transition-transform duration-300",
          ],
          [isMobileOpen ? "translate-x-0" : "-translate-x-full"],
        )}
      >
        <nav className="flex flex-1 flex-col gap-1 px-8 pt-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                ["py-2.5 text-base transition-colors"],
                [
                  pathname.startsWith(link.to.replace(/\/$/, ""))
                    ? "text-neutral-200"
                    : "text-neutral-500 hover:text-neutral-300",
                ],
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3 px-8 pb-8">
          <SidebarCTA platformCTA={platformCTA} />
        </div>
      </aside>
    </>
  );
}

function MobileTopBar({
  isMobileOpen,
  setIsMobileOpen,
}: {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}) {
  return (
    <div className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 md:hidden">
      <Link to="/">
        <CharLogo className="h-5 w-auto text-neutral-500" />
      </Link>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:text-neutral-200"
        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  );
}

function SidebarCTA({
  platformCTA,
}: {
  platformCTA: ReturnType<typeof getPlatformCTA>;
}) {
  const baseClass =
    "flex h-9 items-center justify-center rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100";

  if (platformCTA.action === "download") {
    return (
      <a href="/download/apple-silicon" download className={baseClass}>
        {platformCTA.label}
      </a>
    );
  }

  return (
    <Link to="/" className={baseClass}>
      {platformCTA.label}
    </Link>
  );
}
