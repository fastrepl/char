import { createFileRoute, Outlet } from "@tanstack/react-router";

import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";

import { useConfigSideEffects } from "../../config/use-config";
import { ListenerProvider } from "../../contexts/listener";

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
