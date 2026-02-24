import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import {
  convertDraftToReady,
  getFileContentFromBranch,
  getGitHubCredentials,
  parseMDX,
  updateContentFileOnBranch,
} from "@/functions/github-content";

const GITHUB_REPO = "fastrepl/hyprnote";

interface SubmitForReviewRequest {
  path: string;
  branch: string;
  prNumber: number;
}

function buildFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines: string[] = [];

  if (frontmatter.meta_title) {
    lines.push(`meta_title: ${JSON.stringify(frontmatter.meta_title)}`);
  }
  if (frontmatter.display_title) {
    lines.push(`display_title: ${JSON.stringify(frontmatter.display_title)}`);
  }
  if (frontmatter.meta_description) {
    lines.push(
      `meta_description: ${JSON.stringify(frontmatter.meta_description)}`,
    );
  }
  if (frontmatter.author) {
    lines.push(`author: ${JSON.stringify(frontmatter.author)}`);
  }
  if (frontmatter.featured !== undefined) {
    lines.push(`featured: ${frontmatter.featured}`);
  }
  lines.push(`published: true`);
  lines.push(`ready_for_review: true`);
  if (frontmatter.category) {
    lines.push(`category: ${JSON.stringify(frontmatter.category)}`);
  }
  if (frontmatter.date) {
    lines.push(`date: ${JSON.stringify(frontmatter.date)}`);
  }
  if (frontmatter.coverImage) {
    lines.push(`coverImage: ${JSON.stringify(frontmatter.coverImage)}`);
  }

  return `---\n${lines.join("\n")}\n---\n`;
}

async function addReviewerToPR(
  prNumber: number,
  reviewer: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}/requested_reviewers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewers: [reviewer],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `GitHub API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add reviewer: ${(error as Error).message}`,
    };
  }
}

export const Route = createFileRoute("/api/admin/content/submit-for-review")({
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

        let body: SubmitForReviewRequest;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { path, branch, prNumber } = body;

        if (!path || !branch || !prNumber) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields: path, branch, prNumber",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const fileResult = await getFileContentFromBranch(path, branch);
        if (!fileResult.success || !fileResult.content) {
          return new Response(
            JSON.stringify({ error: fileResult.error || "File not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        const { frontmatter, content } = parseMDX(fileResult.content);

        const newFrontmatter = buildFrontmatter(frontmatter);
        const fullContent = `${newFrontmatter}\n${content}`;

        const updateResult = await updateContentFileOnBranch(
          path,
          fullContent,
          branch,
        );

        if (!updateResult.success) {
          return new Response(JSON.stringify({ error: updateResult.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!isDev) {
          const convertResult = await convertDraftToReady(prNumber);
          if (!convertResult.success) {
            console.warn(
              "Failed to convert draft PR to ready:",
              convertResult.error,
            );
          }

          const credentials = await getGitHubCredentials();
          if (credentials?.token) {
            const reviewerResult = await addReviewerToPR(
              prNumber,
              "ComputelessComputer",
              credentials.token,
            );

            if (!reviewerResult.success) {
              console.warn("Failed to add reviewer:", reviewerResult.error);
            }
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Article submitted for review",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
