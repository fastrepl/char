import { useMutation } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRightIcon, ExternalLinkIcon, MailIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { addContact } from "@/functions/loops";

const vsList = [
  { slug: "otter", name: "Otter.ai" },
  { slug: "granola", name: "Granola" },
  { slug: "fireflies", name: "Fireflies" },
  { slug: "fathom", name: "Fathom" },
  { slug: "notion", name: "Notion" },
  { slug: "obsidian", name: "Obsidian" },
];

const useCasesList = [
  { to: "/solution/sales", label: "Sales" },
  { to: "/solution/recruiting", label: "Recruiting" },
  { to: "/solution/consulting", label: "Consulting" },
  { to: "/solution/coaching", label: "Coaching" },
  { to: "/solution/research", label: "Research" },
  { to: "/solution/journalism", label: "Journalism" },
];

function getMaxWidthClass(pathname: string): string {
  const isBlogOrDocs =
    pathname.startsWith("/blog") || pathname.startsWith("/docs");
  return isBlogOrDocs ? "max-w-6xl" : "max-w-6xl";
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const router = useRouterState();
  const maxWidthClass = getMaxWidthClass(router.location.pathname);

  return (
    <footer className="border-t border-neutral-100 bg-linear-to-b from-stone-50/30 to-stone-100">
      <div
        className={`${maxWidthClass} mx-auto px-4 laptop:px-0 py-12 lg:py-16 border-x border-neutral-100`}
      >
        <div className="flex flex-col lg:flex-row gap-12">
          <BrandSection currentYear={currentYear} />
          <LinksGrid />
        </div>
      </div>
    </footer>
  );
}

function BrandSection({ currentYear }: { currentYear: number }) {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      await addContact({
        data: {
          email,
          userGroup: "Lead",
          source: "LANDING_PAGE",
        },
      });
    },
    onSuccess: () => {
      setEmail("");
    },
  });

  return (
    <div className="lg:flex-1">
      <Link
        to="/"
        className="inline-block mb-4 font-semibold text-2xl font-serif"
      >
        Char
      </Link>
      <p className="text-sm text-neutral-500 mb-4">Fastrepl © {currentYear}</p>

      <div className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) {
              mutation.mutate();
            }
          }}
          className="max-w-72 border border-neutral-100 bg-white transition-all laptop:border-l-0"
        >
          <div className="relative flex items-center">
            <MailIcon className="absolute left-2.5 size-3.5 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Subscribe to updates"
              className={cn([
                "min-w-0 flex-1 pl-8 pr-2 py-1.5 text-sm",
                "bg-transparent placeholder:text-neutral-400",
                "focus:outline-none",
              ])}
            />
            <button
              type="submit"
              disabled={!email || mutation.isPending}
              className={cn([
                "shrink-0 px-2 transition-colors focus:outline-none",
                email ? "text-stone-600" : "text-neutral-300",
                mutation.isPending && "opacity-50",
              ])}
            >
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </form>
        <p className="text-xs text-neutral-400 mt-1.5">
          Only important stuff like release notes and interesting articles.
        </p>
        {mutation.isError && (
          <p className="text-xs text-red-500 mt-1">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <p className="text-sm text-neutral-500">
        <Link
          to="/legal/$slug/"
          params={{ slug: "terms" }}
          className="hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
        >
          Terms
        </Link>
        {" · "}
        <Link
          to="/legal/$slug/"
          params={{ slug: "privacy" }}
          className="hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
        >
          Privacy
        </Link>
      </p>
    </div>
  );
}

function LinksGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:shrink-0">
      <ProductLinks />
      <ResourcesLinks />
      <CompanyLinks />
      <ToolsLinks />
      <SocialLinks />
    </div>
  );
}

function ProductLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Product
      </h3>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/download/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Download
          </Link>
        </li>
        <li>
          <Link
            to="/changelog/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Changelog
          </Link>
        </li>
        <li>
          <Link
            to="/roadmap/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Roadmap
          </Link>
        </li>
        <li>
          <Link
            to="/docs/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Docs
          </Link>
        </li>
        <li>
          <a
            href="https://github.com/fastrepl/char"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            GitHub
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="https://status.hyprnote.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Status
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
      </ul>
    </div>
  );
}

function useRotatingIndex(listLength: number, interval: number) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const pausedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * listLength));
  }, [listLength]);

  const advance = useCallback(() => {
    if (pausedRef.current) return;
    setFading(true);
    timeoutRef.current = setTimeout(() => {
      if (pausedRef.current) return;
      setIndex((prev) => (prev + 1) % listLength);
      setFading(false);
    }, 200);
  }, [listLength]);

  useEffect(() => {
    const id = setInterval(advance, interval);
    return () => {
      clearInterval(id);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [advance, interval]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);
  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  return { index, fading, pause, resume };
}

function ResourcesLinks() {
  const vs = useRotatingIndex(vsList.length, 3000);
  const useCase = useRotatingIndex(useCasesList.length, 4000);

  const currentVs = vsList[vs.index];
  const currentUseCase = useCasesList[useCase.index];

  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Resources
      </h3>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/pricing/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Pricing
          </Link>
        </li>
        <li>
          <a
            href="/docs/faq"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            FAQ
          </a>
        </li>
        <li>
          <Link
            to="/company-handbook/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Company Handbook
          </Link>
        </li>
        <li>
          <Link
            to="/gallery/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Prompt Gallery
          </Link>
        </li>
        <li>
          <a
            href="https://github.com/fastrepl/char/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Discussions
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="mailto:support@hyprnote.com"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Support
            <MailIcon className="size-3" />
          </a>
        </li>
        <li onMouseEnter={useCase.pause} onMouseLeave={useCase.resume}>
          <Link
            to={currentUseCase.to}
            className={cn(
              "text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted",
              "inline-flex items-center gap-1",
            )}
            aria-label={`Char for ${currentUseCase.label}`}
          >
            👍 for{" "}
            <span
              className={cn(
                "transition-opacity duration-200",
                useCase.fading ? "opacity-0" : "opacity-100",
              )}
            >
              {currentUseCase.label}
            </span>
          </Link>
        </li>
        <li onMouseEnter={vs.pause} onMouseLeave={vs.resume}>
          <Link
            to="/vs/$slug/"
            params={{ slug: currentVs.slug }}
            className={cn(
              "text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted",
              "inline-flex items-center gap-1",
            )}
            aria-label={`Versus ${currentVs.name}`}
          >
            <img
              src="/api/images/hyprnote/icon.png"
              alt="Char"
              width={12}
              height={12}
              className="size-4 rounded border border-neutral-100 inline"
            />{" "}
            vs{" "}
            <span
              className={cn(
                "transition-opacity duration-200",
                vs.fading ? "opacity-0" : "opacity-100",
              )}
            >
              {currentVs.name}
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function CompanyLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Company
      </h3>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/blog/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Blog
          </Link>
        </li>
        <li>
          <Link
            to="/about/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            About us
          </Link>
        </li>
        <li>
          <Link
            to="/jobs/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Jobs
          </Link>
        </li>
        <li>
          <Link
            to="/brand/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Brand
          </Link>
        </li>
        <li>
          <Link
            to="/press-kit/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Press Kit
          </Link>
        </li>
        <li>
          <Link
            to="/opensource/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Open Source
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ToolsLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Tools
      </h3>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/eval/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            AI Eval
          </Link>
        </li>
        <li>
          <Link
            to="/file-transcription/"
            search={{ id: undefined }}
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Audio Transcription
          </Link>
        </li>
        <li>
          <Link
            to="/oss-friends/"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            OSS Navigator
          </Link>
        </li>
      </ul>
    </div>
  );
}

function SocialLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Social
      </h3>
      <ul className="flex flex-col gap-3">
        <li>
          <a
            href="/x"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Twitter
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="/discord"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Discord
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="/youtube"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            YouTube
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="/linkedin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            LinkedIn
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
      </ul>
    </div>
  );
}
