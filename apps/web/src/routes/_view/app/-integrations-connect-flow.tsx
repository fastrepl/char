import Nango from "@nangohq/frontend";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createConnectSession,
  createReconnectSession,
  listConnections,
} from "@hypr/api-client";

import { type ApiClient, useApiClient } from "@/hooks/use-api-client";

import { IntegrationButton, IntegrationPageLayout } from "./-integration-ui";
import { getIntegrationDisplay, Route } from "./integration";

async function waitForConnection(
  client: ApiClient,
  integrationId: string,
  expectedConnectionId?: string,
): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const { data, error } = await listConnections({ client });
    if (!error) {
      const connection = (data?.connections ?? []).find(
        (item) => item.integration_id === integrationId,
      );

      if (
        connection &&
        (!expectedConnectionId ||
          connection.connection_id === expectedConnectionId)
      ) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export function ConnectFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getClient } = useApiClient();
  const [nango] = useState(() => new Nango());
  const [isConnecting, setIsConnecting] = useState(false);
  const autoConnectTriggeredRef = useRef(false);

  const display = getIntegrationDisplay(search.integration_id);

  const {
    mutateAsync: createSession,
    reset: resetCreateSession,
    isPending: isLoading,
    isError: isCreateSessionError,
  } = useMutation({
    mutationFn: async () => {
      const client = await getClient();

      if (search.connection_id) {
        const { data, error } = await createReconnectSession({
          client,
          body: {
            connection_id: search.connection_id,
            integration_id: search.integration_id,
          },
        });

        if (error || !data) {
          throw new Error("Failed to create reconnect session");
        }

        return { sessionToken: data.token, client };
      }

      const { data, error } = await createConnectSession({
        client,
        body: { allowed_integrations: [search.integration_id] },
      });

      if (error || !data) {
        throw new Error("Failed to create connect session");
      }

      return { sessionToken: data.token, client };
    },
  });

  const handleConnect = useCallback(async () => {
    if (isLoading || isConnecting) {
      return;
    }

    resetCreateSession();

    let sessionToken: string;
    let apiClient: ApiClient;

    try {
      const result = await createSession();
      sessionToken = result.sessionToken;
      apiClient = result.client;
    } catch {
      return;
    }

    setIsConnecting(true);
    let didComplete = false;

    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "close" && !didComplete) {
          setIsConnecting(false);
        }

        if (event.type === "connect") {
          void (async () => {
            try {
              const eventPayload = event.payload as
                | { connectionId?: string }
                | undefined;

              await waitForConnection(
                apiClient,
                search.integration_id,
                eventPayload?.connectionId,
              );

              didComplete = true;

              await queryClient.invalidateQueries({
                queryKey: ["integration-status"],
              });

              await navigate({
                to: "/callback/integration/",
                search: {
                  integration_id: search.integration_id,
                  status: "success",
                  flow: search.flow,
                  scheme: search.scheme,
                  return_to: search.return_to,
                },
              });
            } catch {
              setIsConnecting(false);
            }
          })();
        }
      },
    });

    connect.setSessionToken(sessionToken);
  }, [
    createSession,
    isConnecting,
    isLoading,
    nango,
    navigate,
    queryClient,
    resetCreateSession,
    search.connection_id,
    search.flow,
    search.integration_id,
    search.return_to,
    search.scheme,
  ]);

  useEffect(() => {
    if (search.flow !== "desktop" || autoConnectTriggeredRef.current) {
      return;
    }

    autoConnectTriggeredRef.current = true;

    if (!isLoading && !isConnecting) {
      void handleConnect();
    }
  }, [handleConnect, isConnecting, isLoading, search.flow]);

  return (
    <IntegrationPageLayout>
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl tracking-tight text-stone-700">
          Connect {display.name}
        </h1>
        <p className="text-neutral-600">
          {isConnecting ? display.connectingHint : display.description}
        </p>
      </div>

      {!isConnecting && !isCreateSessionError && (
        <IntegrationButton onClick={handleConnect} disabled={isLoading}>
          {isLoading && (
            <svg
              className="h-4 w-4 animate-spin text-white"
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
          {isLoading ? "Connecting..." : `Connect ${display.name}`}
        </IntegrationButton>
      )}

      {isCreateSessionError && !isConnecting && (
        <div className="flex flex-col gap-4">
          <p className="text-red-600">
            Something went wrong. Please try again.
          </p>
          <IntegrationButton onClick={handleConnect}>
            Try again
          </IntegrationButton>
        </div>
      )}
    </IntegrationPageLayout>
  );
}
