import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { deleteConnection } from "@hypr/api-client";

import { useApiClient } from "@/hooks/use-api-client";

import { IntegrationButton, IntegrationPageLayout } from "./-integration-ui";
import { getIntegrationDisplay, Route } from "./integration";

export function DisconnectFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getClient } = useApiClient();

  const display = getIntegrationDisplay(search.integration_id);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!search.connection_id) {
        throw new Error("Missing connection id");
      }

      const client = await getClient();
      const { data, error } = await deleteConnection({
        client,
        body: {
          connection_id: search.connection_id,
          integration_id: search.integration_id,
        },
      });

      if (error || !data) {
        throw new Error("Failed to disconnect integration");
      }
    },
    onSuccess: async () => {
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
    },
  });

  return (
    <IntegrationPageLayout>
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl tracking-tight text-stone-700">
          Disconnect {display.name}
        </h1>
        <p className="text-neutral-600">
          This will stop syncing data from {display.name}.
        </p>
      </div>

      {!disconnectMutation.isError && (
        <IntegrationButton
          variant="danger"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending || !search.connection_id}
        >
          {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
        </IntegrationButton>
      )}

      {disconnectMutation.isError && (
        <div className="flex flex-col gap-4">
          <p className="text-red-600">
            Could not disconnect this integration. Please try again.
          </p>
          <IntegrationButton onClick={() => disconnectMutation.mutate()}>
            Try again
          </IntegrationButton>
        </div>
      )}
    </IntegrationPageLayout>
  );
}
