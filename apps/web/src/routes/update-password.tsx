import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { doUpdatePassword, fetchUser } from "@/functions/auth";

export const Route = createFileRoute("/update-password")({
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    const user = await fetchUser();
    if (!user) {
      throw redirect({ to: "/auth/" });
    }
  },
});

function Component() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const updateMutation = useMutation({
    mutationFn: () => doUpdatePassword({ data: { password } }),
    onSuccess: (result) => {
      if (result && "error" in result && result.error) {
        setErrorMessage(
          (result as { error: boolean; message: string }).message,
        );
        return;
      }
      if (result && "success" in result && result.success) {
        navigate({ to: "/auth/" });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    updateMutation.mutate();
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
            Set new password
          </h1>
          <p className="text-sm text-neutral-500">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            className={cn([
              "w-full px-4 py-2",
              "border border-neutral-300 rounded-lg",
              "text-neutral-700 placeholder:text-neutral-400",
              "focus:outline-hidden focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
            ])}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
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
            disabled={updateMutation.isPending || !password || !confirmPassword}
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
            {updateMutation.isPending ? "Updating..." : "Update password"}
          </button>
        </form>

        <Link
          to="/auth/"
          className="flex items-center justify-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mt-4"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
