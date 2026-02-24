import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/k6-reports/")({
  component: Component,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});

interface Report {
  id: number;
  name: string;
  created_at: string;
  run_id?: number;
}

function Component() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["k6-reports"],
    queryFn: async () => {
      const res = await fetch("/api/k6-reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json() as Promise<{ reports: Report[] }>;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-neutral-200 rounded w-1/3" />
          <div className="h-4 bg-neutral-200 rounded w-1/2" />
          <div className="flex flex-col gap-2 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-neutral-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-neutral-600 mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  const reports = data?.reports || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">K6 Load Test Reports</h1>
      <p className="text-neutral-600 mt-2">
        WebSocket stability test results from CI
      </p>

      {reports.length === 0 ? (
        <div className="mt-8 p-8 bg-neutral-50 rounded-lg text-center">
          <p className="text-neutral-500">No reports available</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {reports.map((report) => (
            <Link
              key={report.id}
              to="/k6-reports/$id/"
              params={{ id: String(report.id) }}
              className="block p-4 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{report.name}</div>
                  <div className="text-sm text-neutral-500">
                    {new Date(report.created_at).toLocaleString()}
                  </div>
                </div>
                {report.run_id && (
                  <a
                    href={`https://github.com/fastrepl/hyprnote/actions/runs/${report.run_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Run →
                  </a>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
