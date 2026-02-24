import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import { getGitHubCredentials } from "@/functions/github-content";

interface SaveRequest {
  content: string;
  filename: string;
  folder: string;
}

export const Route = createFileRoute("/api/admin/import/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const isDev = process.env.NODE_ENV === "development";
        if (!isDev) {
          const user = await fetchAdminUser();
          if (!user?.isAdmin) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        try {
          const body: SaveRequest = await request.json();
          const { content, filename, folder } = body;

          if (!content || !filename || !folder) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Content, filename, and folder are required",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const validFolders = [
            "articles",
            "changelog",
            "docs",
            "handbook",
            "legal",
            "templates",
          ];
          if (!validFolders.includes(folder)) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Invalid folder. Must be one of: ${validFolders.join(", ")}`,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const safeFilename = filename
            .replace(/[^a-zA-Z0-9-_.]/g, "-")
            .replace(/-+/g, "-")
            .toLowerCase();

          if (!safeFilename.endsWith(".mdx")) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Filename must end with .mdx",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const owner = "fastrepl";
          const repo = "hyprnote";
          const path = `apps/web/content/${folder}/${safeFilename}`;
          const branch = "main";

          const credentials = await getGitHubCredentials();
          if (!credentials) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "GitHub token not configured",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
          const { token } = credentials;

          const checkResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            },
          );

          if (checkResponse.status === 200) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `File already exists: ${path}`,
              }),
              { status: 409, headers: { "Content-Type": "application/json" } },
            );
          } else if (checkResponse.status !== 404) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Failed to check file existence: ${checkResponse.statusText}`,
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const contentBase64 = Buffer.from(content).toString("base64");

          const createResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: `Add ${folder}/${safeFilename} via admin import`,
                content: contentBase64,
                branch,
              }),
            },
          );

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return new Response(
              JSON.stringify({
                success: false,
                error: errorData.message || "Failed to create file",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const result = await createResponse.json();

          return new Response(
            JSON.stringify({
              success: true,
              path,
              url: result.content?.html_url,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: (err as Error).message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
