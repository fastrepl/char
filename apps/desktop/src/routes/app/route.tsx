import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useConfigSideEffects } from "~/shared/config";
import { ListenerProvider } from "~/stt/contexts";

import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { listenerStore } }) => {
    return { listenerStore: listenerStore! };
  },
});

function Component() {
  const { listenerStore } = Route.useLoaderData();

  return (
    <TooltipProvider>
      <ListenerProvider store={listenerStore}>
        <Outlet />
        <SideEffects />
      </ListenerProvider>
    </TooltipProvider>
  );
}

function SideEffects() {
  useConfigSideEffects();

  return null;
}
