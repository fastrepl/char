import { useOutlit } from "@outlit/browser/react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { exchangeOAuthCode, exchangeOtpToken } from "@/functions/auth";
import { useAnalytics } from "@/hooks/use-posthog";

const validateSearch = z.object({
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.enum(["email", "recovery"]).optional(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
  scheme: z.string().default("hyprnote"),
  redirect: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/_view/callback/auth")({
  validateSearch,
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ search }) => {
    if (search.flow === "web" && search.code) {
      const result = await exchangeOAuthCode({
        data: { code: search.code, flow: "web" },
      });

      if (result.success) {
        if (search.type === "recovery") {
          throw redirect({ to: "/update-password/", search: {} });
        }
        throw redirect({
          to: search.redirect || "/app/account/",
          search: {},
        });
      } else {
        console.error(result.error);
      }
    }

    if (search.flow === "desktop" && search.code) {
      const result = await exchangeOAuthCode({
        data: { code: search.code, flow: "desktop" },
      });

      if (result.success) {
        throw redirect({
          to: "/callback/auth/",
          search: {
            flow: "desktop",
            scheme: search.scheme,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
          },
        });
      } else {
        console.error(result.error);
      }
    }

    if (search.token_hash && search.type) {
      if (search.type === "recovery") {
        const result = await exchangeOtpToken({
          data: {
            token_hash: search.token_hash,
            type: search.type,
            flow: search.flow,
          },
        });

        if (result.success) {
          throw redirect({ to: "/update-password/", search: {} });
        } else {
          console.error(result.error);
        }
      } else {
        const result = await exchangeOtpToken({
          data: {
            token_hash: search.token_hash,
            type: search.type,
            flow: search.flow,
          },
        });

        if (result.success) {
          if (search.flow === "web") {
            throw redirect({
              to: search.redirect || "/app/account/",
              search: {},
            });
          }

          if (search.flow === "desktop") {
            throw redirect({
              to: "/callback/auth/",
              search: {
                flow: "desktop",
                scheme: search.scheme,
                access_token: result.access_token,
                refresh_token: result.refresh_token,
              },
            });
          }
        } else {
          console.error(result.error);
        }
      }
    }
  },
});

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { identify: identifyOutlit, isInitialized } = useOutlit();
  const { identify: identifyPosthog } = useAnalytics();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!search.access_token || !isInitialized) return;

    try {
      const payload = JSON.parse(atob(search.access_token.split(".")[1]));
      const email = payload.email;
      const userId = payload.sub;

      if (email && userId) {
        identifyOutlit({
          email,
          userId,
          traits: {
            auth_provider: payload.app_metadata?.provider,
          },
        });
        identifyPosthog(userId, { email });
      }
    } catch (e) {
      console.error("Failed to decode JWT for identify:", e);
    }
  }, [search.access_token, identifyOutlit, isInitialized]);

  const getDeeplink = () => {
    if (search.access_token && search.refresh_token) {
      const params = new URLSearchParams();
      params.set("access_token", search.access_token);
      params.set("refresh_token", search.refresh_token);
      return `${search.scheme}://auth/callback?${params.toString()}`;
    }
    return null;
  };

  // Browsers require a user gesture (click) to open custom URL schemes.
  // Auto-triggering via setTimeout fails for email magic links because
  // the page is opened from an external context (email client) without
  // "transient user activation". OAuth redirects work because they maintain
  // activation through the redirect chain.
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
    if (search.flow === "web" && !search.error) {
      navigate({
        to: search.redirect || "/app/account/",
        search: {},
        replace: true,
      });
    }
  }, [search, navigate]);

  if (search.error) {
    return (
      <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-serif tracking-tight text-stone-600">
              Sign-in failed
            </h1>
            <p className="text-neutral-600">
              {search.error_description
                ? search.error_description.replaceAll("+", " ")
                : "Something went wrong during sign-in"}
            </p>
          </div>

          <a
            href={`/auth?flow=${search.flow}&scheme=${search.scheme}`}
            className={cn([
              "w-full h-12 flex items-center justify-center text-base font-medium transition-all cursor-pointer",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            ])}
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  if (search.flow === "desktop") {
    const hasTokens = search.access_token && search.refresh_token;

    return (
      <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-serif tracking-tight text-stone-600">
              {hasTokens ? "Sign-in successful" : "Signing in..."}
            </h1>
            <p className="text-neutral-600">
              {hasTokens
                ? "Click the button below to return to the app"
                : "Please wait while we complete the sign-in"}
            </p>
          </div>

          {hasTokens && (
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
