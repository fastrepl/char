import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { deleteConnection } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { cn } from "@hypr/utils";

import { env } from "@/env";
import { getAccessToken } from "@/functions/access-token";

import { getIntegrationDisplay, Route } from "./integration";

export function DisconnectFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const display = getIntegrationDisplay(search.integration_id);

  const handleDisconnect = async () => {
    if (!search.connection_id) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const token = await getAccessToken();
      const client = createClient({
        baseUrl: env.VITE_API_URL,
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data, error } = await deleteConnection({
        client,
        body: {
          connection_id: search.connection_id,
          integration_id: search.integration_id,
        },
      });

      if (error || !data) {
        setStatus("error");
        return;
      }
    } catch {
      setStatus("error");
      return;
    }

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
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-white via-stone-50/20 to-white p-6">
      <div className="flex w-full max-w-md flex-col gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-3xl tracking-tight text-stone-700">
            Disconnect {display.name}
          </h1>
          <p className="text-neutral-600">
            This will stop syncing data from {display.name}.
          </p>
        </div>

        {status !== "error" && (
          <button
            onClick={handleDisconnect}
            disabled={status === "loading" || !search.connection_id}
            className={cn([
              "flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-medium shadow-md transition-all",
              "bg-linear-to-t from-red-600 to-red-500 text-white",
              status === "loading" || !search.connection_id
                ? "cursor-not-allowed opacity-70"
                : "cursor-pointer hover:scale-[102%] hover:shadow-lg active:scale-[98%]",
            ])}
          >
            {status === "loading" ? "Disconnecting..." : "Disconnect"}
          </button>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-4">
            <p className="text-red-600">
              Could not disconnect this integration. Please try again.
            </p>
            <button
              onClick={handleDisconnect}
              className={cn([
                "flex h-12 w-full cursor-pointer items-center justify-center text-base font-medium transition-all",
                "rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white shadow-md hover:scale-[102%] hover:shadow-lg active:scale-[98%]",
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
