import Nango from "@nangohq/frontend";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { nangoCreateConnectSession } from "../../../functions/nango";

const validateSearch = z.object({
  flow: z.enum(["desktop", "web"]).default("web"),
  scheme: z.string().default("hyprnote"),
});

export const Route = createFileRoute("/_view/app/integration")({
  validateSearch,
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

function Component() {
  const search = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const getSessionToken = useServerFn(nangoCreateConnectSession);
  const [nango] = useState(() => new Nango());
  const [status, setStatus] = useState<
    "idle" | "connecting" | "success" | "error"
  >("idle");
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleConnect = async () => {
    if (!user) return;
    setStatus("connecting");

    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "close") {
          if (
            statusRef.current !== "success" &&
            statusRef.current !== "error"
          ) {
            setStatus("idle");
          }
        } else if (event.type === "connect") {
          setStatus("success");
          void navigate({
            to: "/callback/integration/",
            search: {
              integration_id: "google-calendar",
              status: "success",
              flow: search.flow,
              scheme: search.scheme,
            },
          });
        }
      },
    });

    try {
      const { sessionToken } = await getSessionToken({
        data: {
          allowedIntegrations: ["google-calendar"],
        },
      });
      connect.setSessionToken(sessionToken);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-serif tracking-tight text-stone-600">
            Connect Google Calendar
          </h1>
          <p className="text-neutral-600">
            {status === "connecting"
              ? "Follow the prompts to connect your Google account"
              : "Connect your Google Calendar to sync your meetings"}
          </p>
        </div>

        {status === "idle" && (
          <button
            onClick={handleConnect}
            className={cn([
              "w-full h-12 flex items-center justify-center text-base font-medium transition-all cursor-pointer",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            ])}
          >
            Connect Google Calendar
          </button>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-4">
            <p className="text-red-600">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className={cn([
                "w-full h-12 flex items-center justify-center text-base font-medium transition-all cursor-pointer",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              ])}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
