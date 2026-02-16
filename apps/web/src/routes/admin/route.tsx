import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin - Char" },
      { name: "description", content: "Char admin dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (import.meta.env.DEV) {
      return { user: { email: "dev@local", isAdmin: true } };
    }

    const user = await fetchAdminUser();

    if (!user) {
      throw redirect({
        to: "/auth/",
        search: {
          provider: "github",
          redirect: location.pathname,
          rra: true,
        },
      });
    }

    if (!user.isAdmin) {
      throw redirect({
        to: "/",
      });
    }

    return { user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();

  return (
    <div className="h-screen bg-white flex flex-col">
      <AdminHeader user={user} />
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}

function AdminHeader({ user }: { user: { email: string } }) {
  const firstName = user.email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <header className="h-16 border-b border-neutral-200 bg-white">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/admin/"
            className="font-serif2 italic text-stone-600 text-2xl"
          >
            Char Admin
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/admin/collections/"
              className="relative py-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors [&.active]:text-neutral-900 font-medium [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-1/2 [&.active]:after:-translate-x-1/2 [&.active]:after:w-7 [&.active]:after:h-0.5 [&.active]:after:bg-neutral-900 [&.active]:after:rounded-full"
              activeProps={{ className: "active" }}
            >
              Articles
            </Link>
            <Link
              to="/admin/media/"
              className="relative py-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors [&.active]:text-neutral-900 font-medium [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-1/2 [&.active]:after:-translate-x-1/2 [&.active]:after:w-7 [&.active]:after:h-0.5 [&.active]:after:bg-neutral-900 [&.active]:after:rounded-full"
              activeProps={{ className: "active" }}
            >
              Media
            </Link>
            <div className="h-4 w-px bg-neutral-300" />
            <Link
              to="/admin/crm/"
              className="relative py-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors [&.active]:text-neutral-900 font-medium [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-1/2 [&.active]:after:-translate-x-1/2 [&.active]:after:w-7 [&.active]:after:h-0.5 [&.active]:after:bg-neutral-900 [&.active]:after:rounded-full"
              activeProps={{ className: "active" }}
            >
              CRM
            </Link>
            <Link
              to="/admin/lead-finder/"
              className="relative py-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors [&.active]:text-neutral-900 font-medium [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-1/2 [&.active]:after:-translate-x-1/2 [&.active]:after:w-7 [&.active]:after:h-0.5 [&.active]:after:bg-neutral-900 [&.active]:after:rounded-full"
              activeProps={{ className: "active" }}
            >
              Lead Finder
            </Link>
            <div className="h-4 w-px bg-neutral-300" />
            <Link
              to="/admin/kanban/"
              className="relative py-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors [&.active]:text-neutral-900 font-medium [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-1/2 [&.active]:after:-translate-x-1/2 [&.active]:after:w-7 [&.active]:after:h-0.5 [&.active]:after:bg-neutral-900 [&.active]:after:rounded-full"
              activeProps={{ className: "active" }}
            >
              Kanban
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-sm text-neutral-600">
            Welcome {displayName}!
          </span>
          <Link
            to="/"
            className="px-4 h-8 flex items-center text-sm text-red-600 bg-linear-to-b from-white to-red-50 border border-red-200 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Sign out
          </Link>
        </div>
      </div>
    </header>
  );
}
