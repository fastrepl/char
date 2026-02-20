import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reddit")({
  beforeLoad: () => {
    throw redirect({
      href: "https://www.reddit.com/r/Hyprnote/",
    } as any);
  },
});
