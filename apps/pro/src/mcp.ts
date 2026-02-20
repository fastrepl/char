import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { env } from "./env.js";
import { exa, searchAndContentsInputSchema } from "./exa.js";

export const mcpServer = new McpServer({
  name: "hyprnote-mcp-server",
  version: "0.0.1",
});

mcpServer.registerTool(
  "exa-search",
  {
    title: "Exa Web Search",
    description:
      "Search the web via Exa and optionally include page text and highlights in results.",
    inputSchema: searchAndContentsInputSchema.shape,
  },
  async (args) => {
    const { results } = await exa.searchAndContents(args.query, {
      ...args,
      numResults: 10,
      type: "auto",
    });

    const processed = results.map(({ title, text }) => ({ title, text }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(processed, null, 2),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "read-url",
  {
    title: "Read URL",
    description: "Visit a URL and return the content as markdown.",
    inputSchema: z.object({ url: z.string() }).shape,
  },
  async ({ url }) => {
    const encoded = encodeURIComponent(url);
    const text = await fetch(`https://r.jina.ai/${encoded}`, {
      headers: { Authorization: `Bearer ${env.JINA_API_KEY}` },
    }).then((res) => res.text());

    return {
      content: [{ type: "text", text }],
    };
  },
);
