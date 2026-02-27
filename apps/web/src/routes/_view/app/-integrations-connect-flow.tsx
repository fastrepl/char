import Nango from "@nangohq/frontend";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { createConnectSession, createReconnectSession } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { cn } from "@hypr/utils";

import { env } from "@/env";
import { getAccessToken } from "@/functions/access-token";

import { getIntegrationDisplay, Route } from "./integration";

export function ConnectFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [nango] = useState(() => new Nango());
  const [status, setStatus] = useState<
    "idle" | "loading" | "connecting" | "success" | "error"
  >("idle");
  const statusRef = useRef(status);
  const inFlightRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const display = getIntegrationDisplay(search.integration_id);

  const handleConnect = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus("loading");

    let sessionToken: string;

    try {
      const token = await getAccessToken();
      const apiClient = createClient({
        baseUrl: env.VITE_API_URL,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (search.connection_id) {
        const { data, error } = await createReconnectSession({
          client: apiClient,
          body: {
            connection_id: search.connection_id,
            integration_id: search.integration_id,
          },
        });
        if (error || !data) {
          inFlightRef.current = false;
          setStatus("error");
          return;
        }
        sessionToken = data.token;
      } else {
        const { data, error } = await createConnectSession({
          client: apiClient,
          body: { allowed_integrations: [search.integration_id] },
        });
        if (error || !data) {
          inFlightRef.current = false;
          setStatus("error");
          return;
        }
        sessionToken = data.token;
      }
    } catch {
      inFlightRef.current = false;
      setStatus("error");
      return;
    }

    setStatus("connecting");

    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "close") {
          if (
            statusRef.current !== "success" &&
            statusRef.current !== "error"
          ) {
            inFlightRef.current = false;
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

    connect.setSessionToken(sessionToken);
  };

  useEffect(() => {
    if (search.flow === "desktop") {
      void handleConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = status === "loading";
  const isConnecting = status === "connecting";

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-serif tracking-tight text-stone-700">
            Connect {display.name}
          </h1>
          <p className="text-neutral-600">
            {isConnecting ? display.connectingHint : display.description}
          </p>
        </div>

        {(status === "idle" || isLoading) && (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className={cn([
              "w-full h-12 flex items-center justify-center gap-2 text-base font-medium transition-all rounded-full shadow-md",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              isLoading
                ? "opacity-70 cursor-not-allowed"
                : "cursor-pointer hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            ])}
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isLoading ? "Connecting…" : `Connect ${display.name}`}
          </button>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-4">
            <p className="text-red-600">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={handleConnect}
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
