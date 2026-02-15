import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { doPasswordResetRequest } from "@/functions/auth";

export const Route = createFileRoute("/reset-password")({
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

function Component() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetMutation = useMutation({
    mutationFn: () => doPasswordResetRequest({ data: { email } }),
    onSuccess: (result) => {
      if (result && "error" in result && result.error) {
        setErrorMessage(
          (result as { error: boolean; message: string }).message,
        );
        return;
      }
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    resetMutation.mutate();
  };

  return (
    <div
      className={cn([
        "flex items-center justify-center min-h-screen p-4",
        "bg-linear-to-b from-stone-50 via-stone-100/50 to-stone-50",
      ])}
    >
      <div className="bg-white border border-neutral-200 rounded-xs p-8 max-w-md mx-auto">
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
              alt="Char"
              width={96}
              height={96}
              className={cn([
                "size-24",
                "rounded-3xl border border-neutral-200",
              ])}
            />
          </div>
          <h1 className="text-3xl font-serif text-stone-800 mb-2">
            Reset your password
          </h1>
          <p className="text-sm text-neutral-500">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="text-center p-4 bg-stone-50 rounded-lg border border-stone-200">
            <p className="text-stone-700 font-medium">Check your email</p>
            <p className="text-sm text-stone-500 mt-1">
              We sent a password reset link to {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className={cn([
                "w-full px-4 py-2",
                "border border-neutral-300 rounded-lg",
                "text-neutral-700 placeholder:text-neutral-400",
                "focus:outline-hidden focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
              ])}
            />
            {errorMessage && (
              <p className="text-sm text-red-500 text-center">{errorMessage}</p>
            )}
            <button
              type="submit"
              disabled={resetMutation.isPending || !email}
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
              {resetMutation.isPending ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <Link
          to="/auth/"
          className="flex items-center justify-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mt-4"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
