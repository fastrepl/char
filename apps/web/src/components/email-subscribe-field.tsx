import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon, MailIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { addContact } from "@/functions/loops";

export function EmailSubscribeField({
  className,
  formClassName,
  source = "LANDING_PAGE",
  variant = "footer",
  buttonLabel = "Subscribe",
}: {
  className?: string;
  formClassName?: string;
  source?: string;
  variant?: "footer" | "hero";
  buttonLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const isHeroVariant = variant === "hero";

  const mutation = useMutation({
    mutationFn: async () => {
      await addContact({
        data: {
          email,
          userGroup: "Lead",
          source,
        },
      });
    },
    onSuccess: () => {
      setEmail("");
    },
  });

  return (
    <div className={cn([className])}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email) {
            mutation.mutate();
          }
        }}
        className={cn([
          isHeroVariant &&
            "relative flex items-center border-2 rounded-full overflow-hidden transition-all duration-200 border-neutral-200 focus-within:border-stone-500 bg-white",
          !isHeroVariant && "border border-neutral-100 bg-white transition-all",
          formClassName,
        ])}
      >
        {isHeroVariant ? (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Subscribe to updates"
              className="flex-1 px-6 py-4 pr-36 text-base outline-hidden bg-white placeholder:text-neutral-400"
              disabled={mutation.isPending || mutation.isSuccess}
            />
            <button
              type="submit"
              disabled={!email || mutation.isPending || mutation.isSuccess}
              className="absolute right-1 px-6 py-3 text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
            >
              {mutation.isPending
                ? "Sending..."
                : mutation.isSuccess
                  ? "Sent!"
                  : buttonLabel}
            </button>
          </>
        ) : (
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
        )}
      </form>

      {isHeroVariant && mutation.isSuccess && (
        <p className="text-green-600 mt-4 text-sm">
          Thanks! We'll be in touch soon.
        </p>
      )}
      {isHeroVariant && mutation.isError && (
        <p className="text-red-600 mt-4 text-sm">
          Something went wrong. Please try again.
        </p>
      )}

      {!isHeroVariant && mutation.isError && (
        <p className="text-xs text-red-500 mt-1">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
