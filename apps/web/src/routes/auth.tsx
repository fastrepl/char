import { Icon } from "@iconify-icon/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { doAuth, doMagicLinkAuth, fetchUser } from "@/functions/auth";
import { getSupabaseServerClient } from "@/functions/supabase";

const validateSearch = z.object({
  flow: z.enum(["desktop", "web"]).default("web"),
  scheme: z.string().default("hyprnote"),
  redirect: z.string().optional(),
  provider: z.enum(["github", "google"]).optional(),
  rra: z.boolean().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch,
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ search }) => {
    const user = await fetchUser();

    if (user) {
      if (search.flow === "web") {
        throw redirect({ to: search.redirect || "/app/account/" } as any);
      }

      if (search.flow === "desktop") {
        const supabase = getSupabaseServerClient();
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          throw redirect({
            to: "/callback/auth/",
            search: {
              flow: "desktop",
              scheme: search.scheme,
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            },
          });
        }
      }
    }
  },
});

function Component() {
  const { flow, scheme, redirect, provider, rra } = Route.useSearch();

  const showGoogle = !provider || provider === "google";
  const showGithub = !provider || provider === "github";
  const showMagicLink = !provider;

  return (
    <Container>
      <Header />
      <div className="flex flex-col gap-2">
        {showGoogle && (
          <OAuthButton
            flow={flow}
            scheme={scheme}
            redirect={redirect}
            provider="google"
          />
        )}
        {showGithub && (
          <OAuthButton
            flow={flow}
            scheme={scheme}
            redirect={redirect}
            provider="github"
            rra={rra}
          />
        )}
      </div>
      {showMagicLink && (
        <>
          <Divider />
          <MagicLinkForm flow={flow} scheme={scheme} redirect={redirect} />
        </>
      )}
      <PrivacyPolicy />
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn([
        "flex items-center justify-center min-h-screen p-4",
        "bg-linear-to-b from-stone-50 via-stone-100/50 to-stone-50",
      ])}
    >
      <div className="bg-white border border-neutral-200 rounded-xs p-8 max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="text-center mb-8">
      <div
        className={cn([
          "mb-6 mx-auto size-28",
          "shadow-xl border border-neutral-200",
          "flex justify-center items-center",
          "rounded-4xl bg-transparent",
        ])}
      >
        <Image
          src="/api/images/hyprnote/icon.png"
          alt="Hyprnote"
          width={96}
          height={96}
          className={cn(["size-24", "rounded-3xl border border-neutral-200"])}
        />
      </div>
      <h1 className="text-3xl font-serif text-stone-800 mb-2">
        Welcome to Hyprnote
      </h1>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-neutral-200" />
      <span className="text-sm text-neutral-400">or</span>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}

function MagicLinkForm({
  flow,
  scheme,
  redirect,
}: {
  flow: "desktop" | "web";
  scheme?: string;
  redirect?: string;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const magicLinkMutation = useMutation({
    mutationFn: (email: string) =>
      doMagicLinkAuth({
        data: {
          email,
          flow,
          scheme,
          redirect,
        },
      }),
    onSuccess: (result) => {
      if (result && !("error" in result)) {
        setSubmitted(true);
      }
    },
  });

  if (submitted) {
    return (
      <div className="text-center p-4 bg-stone-50 rounded-lg border border-stone-200">
        <p className="text-stone-700 font-medium">Check your email</p>
        <p className="text-sm text-stone-500 mt-1">
          We sent a magic link to {email}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email) {
          magicLinkMutation.mutate(email);
        }
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className={cn([
          "w-full px-4 py-2",
          "border border-neutral-300 rounded-lg",
          "text-neutral-700 placeholder:text-neutral-400",
          "focus:outline-hidden focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
        ])}
      />
      <button
        type="submit"
        disabled={magicLinkMutation.isPending || !email}
        className={cn([
          "w-full px-4 py-2 cursor-pointer",
          "border border-neutral-300",
          "rounded-lg font-medium text-neutral-700",
          "hover:bg-neutral-50",
          "focus:outline-hidden focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors",
          "flex items-center justify-center gap-2",
        ])}
      >
        {magicLinkMutation.isPending ? "Sending..." : "Continue with Email"}
      </button>
      {magicLinkMutation.isError && (
        <p className="text-sm text-red-500 text-center">
          Failed to send magic link. Please try again.
        </p>
      )}
    </form>
  );
}

function PrivacyPolicy() {
  return (
    <p className="text-xs text-neutral-500 mt-4 text-left">
      By signing up, you agree to Hyprnote's{" "}
      <a href="/legal/terms" className="underline hover:text-neutral-700">
        Terms of Service
      </a>{" "}
      and{" "}
      <a href="/legal/privacy" className="underline hover:text-neutral-700">
        Privacy Policy
      </a>
      .
    </p>
  );
}

function OAuthButton({
  flow,
  scheme,
  redirect,
  provider,
  rra,
}: {
  flow: "desktop" | "web";
  scheme?: string;
  redirect?: string;
  provider: "google" | "github";
  rra?: boolean;
}) {
  const oauthMutation = useMutation({
    mutationFn: (provider: "google" | "github") =>
      doAuth({
        data: {
          provider,
          flow,
          scheme,
          redirect,
          rra,
        },
      }),
    onSuccess: (result) => {
      if (result?.url) {
        window.location.href = result.url;
      }
    },
  });
  return (
    <button
      onClick={() => oauthMutation.mutate(provider)}
      disabled={oauthMutation.isPending}
      className={cn([
        "w-full px-4 py-2 cursor-pointer",
        "border border-neutral-300",
        "rounded-lg font-medium text-neutral-700",
        "hover:bg-neutral-50",
        "focus:outline-hidden focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors",
        "flex items-center justify-center gap-2",
      ])}
    >
      {provider === "google" && <Icon icon="logos:google-icon" />}
      {provider === "github" && <Icon icon="logos:github-icon" />}
      Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </button>
  );
}
