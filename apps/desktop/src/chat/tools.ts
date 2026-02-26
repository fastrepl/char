import { tool } from "ai";
import { z } from "zod";
import { searchFiltersSchema } from "~/search/contexts/engine/types";
import type { SearchFilters, SearchHit } from "~/search/contexts/engine/types";

import type { SessionContext } from "@hypr/plugin-template";
import { commands as templateCommands } from "@hypr/plugin-template";

import type { SupportMcpTools } from "./support-mcp-tools";

export interface ToolDependencies {
  search: (
    query: string,
    filters?: SearchFilters | null,
  ) => Promise<SearchHit[]>;
  resolveSessionContext: (sessionId: string) => Promise<SessionContext | null>;
}

const buildSearchSessionsTool = (deps: ToolDependencies) =>
  tool({
    description: `
  Search for sessions (meeting notes) using query and filters.
  Returns relevant sessions with their content.
  `.trim(),
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant sessions"),
      filters: searchFiltersSchema
        .optional()
        .describe("Optional filters for the search query"),
    }),
    execute: async (params: { query: string; filters?: SearchFilters }) => {
      const hits = await deps.search(params.query, params.filters || null);

      const results = await Promise.all(
        hits.slice(0, 5).map(async (hit) => ({
          id: hit.document.id,
          title: hit.document.title,
          excerpt: hit.document.content.slice(0, 180),
          score: hit.score,
          created_at: hit.document.created_at,
          sessionContext: await deps.resolveSessionContext(hit.document.id),
        })),
      );
      const templateResults = results.map((result) => ({
        ...result,
        createdAt: result.created_at,
      }));

      const rendered = await templateCommands.render({
        toolSearchSessions: {
          query: params.query,
          results: templateResults,
        },
      });

      const contextText = rendered.status === "ok" ? rendered.data : null;

      return { results, contextText };
    },
  });

export const buildChatTools = (deps: ToolDependencies) => ({
  search_sessions: buildSearchSessionsTool(deps),
});

type LocalTools = {
  search_sessions: {
    input: { query: string; filters?: SearchFilters };
    output: {
      results: Array<{
        id: string;
        title: string;
        excerpt: string;
        score: number;
        created_at: number;
        sessionContext: SessionContext | null;
      }>;
      contextText: string | null;
    };
  };
};

export type Tools = LocalTools & SupportMcpTools;

export type ToolPartType = `tool-${keyof Tools}`;
