import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

const validateSearch = z.object({
  integration_id: z.string(),
  status: z.string(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
  scheme: z.string().default("hyprnote"),
  return_to: z.string().optional(),
});

type IntegrationDeeplinkParams = {
  integration_id: string;
  status: string;
  return_to?: string;
};

export const Route = createFileRoute("/_view/callback/integration")({
  validateSearch,
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

function buildDeeplinkUrl(
  scheme: string,
  search: IntegrationDeeplinkParams,
): string {
  const params = new URLSearchParams({
    integration_id: search.integration_id,
    status: search.status,
  });
  if (search.return_to) {
    params.set("return_to", search.return_to);
  }
  return `${scheme}://integration/callback?${params.toString()}`;
}

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const getDeeplink = () => {
    return buildDeeplinkUrl(search.scheme, {
      integration_id: search.integration_id,
      status: search.status,
      return_to: search.return_to,
    });
  };

  const handleDeeplink = () => {
    const deeplink = getDeeplink();
    if (search.flow === "desktop" && deeplink) {
      window.location.href = deeplink;
    }
  };

  const handleCopy = async () => {
    const deeplink = getDeeplink();
    if (deeplink) {
      await navigator.clipboard.writeText(deeplink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (search.flow === "web") {
      void navigate({ to: "/app/account/" });
    }
  }, [search.flow, navigate]);

  useEffect(() => {
    if (search.flow === "desktop" && search.status === "success") {
      const deeplink = getDeeplink();
      const timer = setTimeout(() => {
        window.location.href = deeplink;
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [
    search.flow,
    search.status,
    search.scheme,
    search.integration_id,
    search.return_to,
  ]);

  const isSuccess = search.status === "success";

  if (search.flow === "desktop") {
    return (
      <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-serif tracking-tight text-stone-600">
              {isSuccess ? "Connection successful" : "Connection failed"}
            </h1>
            <p className="text-neutral-600">
              {isSuccess
                ? "Click the button below to return to the app"
                : "Something went wrong during the connection"}
            </p>
          </div>

          {isSuccess && (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleDeeplink}
                className={cn([
                  "w-full h-12 flex items-center justify-center text-base font-medium transition-all cursor-pointer",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                ])}
              >
                Open Char
              </button>

              <button
                onClick={handleCopy}
                className={cn([
                  "w-full p-4 flex flex-col items-center gap-3 text-left cursor-pointer transition-all",
                  "bg-stone-50 rounded-lg border border-stone-100 hover:bg-stone-100 active:scale-[99%]",
                ])}
              >
                <p className="text-sm text-stone-500">
                  Button not working? Copy the link instead
                </p>
                <span
                  className={cn([
                    "w-full h-10 flex items-center justify-center gap-2 text-sm font-medium",
                    "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs",
                  ])}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-4" />
                      Copy URL
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (search.flow === "web") {
    return <div>Redirecting...</div>;
  }
}
