import Nango from "@nangohq/frontend";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { createConnectSession } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { cn } from "@hypr/utils";

import { env } from "@/env";
import { getAccessToken } from "@/functions/access-token";

const validateSearch = z.object({
  integration_id: z.string().default("google-calendar"),
  flow: z.enum(["desktop", "web"]).default("web"),
  scheme: z.string().default("hyprnote"),
  return_to: z.string().optional(),
});

const INTEGRATION_DISPLAY: Record<
  string,
  { name: string; description: string; connectingHint: string }
> = {
  "google-calendar": {
    name: "Google Calendar",
    description: "Connect your Google Calendar to sync your meetings",
    connectingHint: "Follow the prompts to connect your Google account",
  },
};

function getIntegrationDisplay(integrationId: string) {
  return (
    INTEGRATION_DISPLAY[integrationId] ?? {
      name: integrationId,
      description: `Connect ${integrationId} to sync your data`,
      connectingHint: "Follow the prompts to complete the connection",
    }
  );
}

export const Route = createFileRoute("/_view/app/integration")({
  validateSearch,
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [nango] = useState(() => new Nango());
  const [status, setStatus] = useState<
    "idle" | "connecting" | "success" | "error"
  >("idle");
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const display = getIntegrationDisplay(search.integration_id);

  const handleConnect = async () => {
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
              integration_id: search.integration_id,
              status: "success",
              flow: search.flow,
              scheme: search.scheme,
              return_to: search.return_to,
            },
          });
        }
      },
    });

    try {
      const token = await getAccessToken();
      const client = createClient({
        baseUrl: env.VITE_API_URL,
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data, error } = await createConnectSession({
        client,
        body: {
          allowed_integrations: [search.integration_id],
        },
      });
      if (error || !data) {
        setStatus("error");
        return;
      }
      connect.setSessionToken(data.token);
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    if (search.flow === "desktop") {
      void handleConnect();
    }
    // Intentionally runs once on mount — handleConnect is not a stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-serif tracking-tight text-stone-600">
            Connect {display.name}
          </h1>
          <p className="text-neutral-600">
            {status === "connecting"
              ? display.connectingHint
              : display.description}
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
            Connect {display.name}
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
