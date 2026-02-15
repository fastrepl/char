import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import * as fs from "fs";
import mdxMermaid from "mdx-mermaid";
import * as path from "path";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { VersionPlatform } from "@/scripts/versioning";

async function embedGithubCode(content: string): Promise<string> {
  const githubCodeRegex = /<GithubCode\s+url="([^"]+)"\s*\/>/g;
  let result = content;

  const matches = [...content.matchAll(githubCodeRegex)];
  for (const match of matches) {
    const [fullMatch, url] = match;

    const repoMatch = url.match(
      /github\.com\/fastrepl\/(hyprnote|char)\/blob\/[^/]+\/(.+)/,
    );
    if (repoMatch) {
      const filePath = repoMatch[2];
      const fileName = path.basename(filePath);
      const localPath = path.resolve(process.cwd(), "..", "..", filePath);

      try {
        const fileContent = fs.readFileSync(localPath, "utf-8");

        const codeBlockMatch = fileContent.match(/```(\w+)\n([\s\S]*?)```/);
        if (codeBlockMatch) {
          const [, lang, code] = codeBlockMatch;
          const escapedCode = JSON.stringify(code.trimEnd());
          result = result.replace(
            fullMatch,
            `<GithubEmbed code={${escapedCode}} fileName="${fileName}" language="${lang}" />`,
          );
        } else {
          const escapedCode = JSON.stringify(fileContent.trimEnd());
          result = result.replace(
            fullMatch,
            `<GithubEmbed code={${escapedCode}} fileName="${fileName}" />`,
          );
        }
      } catch {
        console.warn(`Failed to read local file: ${localPath}`);
      }
    }
  }

  return result;
}

function extractToc(
  content: string,
): Array<{ id: string; text: string; level: number }> {
  const toc: Array<{ id: string; text: string; level: number }> = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();

      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      toc.push({ id, text, level });
    }
  }

  return toc;
}

const articles = defineCollection({
  name: "articles",
  directory: "content/articles",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    display_title: z.string().optional(),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    author: z.string(),
    date: z.string(),
    coverImage: z.string().optional(),
    featured: z.boolean().optional(),
    ready_for_review: z.boolean().default(false),
    category: z
      .enum([
        "Case Study",
        "Products In-depth",
        "Char Weekly",
        "Productivity Hack",
        "Engineering",
      ])
      .optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    const author = document.author || "Char Team";
    const title = document.display_title || document.meta_title;

    return {
      ...document,
      mdx,
      slug,
      author,
      title,
      toc,
    };
  },
});

const changelog = defineCollection({
  name: "changelog",
  directory: "content/changelog",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    date: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const version = document._meta.path.replace(/\.mdx$/, "");
    const baseUrl = `https://github.com/fastrepl/char/releases/download/desktop_v${version}`;
    const downloads: Record<VersionPlatform, string> = {
      "dmg-aarch64": `${baseUrl}/hyprnote-macos-aarch64.dmg`,
      "appimage-x86_64": `${baseUrl}/hyprnote-linux-x86_64.AppImage`,
      "deb-x86_64": `${baseUrl}/hyprnote-linux-x86_64.deb`,
    };

    return {
      ...document,
      mdx,
      slug: version,
      version,
      downloads,
    };
  },
});

const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    section: z.string(),
    summary: z.string().optional(),
  }),
  transform: async (document, context) => {
    const processedContent = await embedGithubCode(document.content);
    const processedDocument = { ...document, content: processedContent };

    const toc = extractToc(processedContent);

    const mdx = await compileMDX(context, processedDocument, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const pathParts = document._meta.path.split("/");
    const fileName = pathParts.pop()!.replace(/\.mdx$/, "");

    const sectionFolder = pathParts[0] || "general";

    const isIndex = fileName === "index";

    const orderMatch = fileName.match(/^(\d+)\./);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 999;

    const cleanFileName = fileName.replace(/^\d+\./, "");
    const filteredPathParts = pathParts.filter((part) => part !== "_");
    const cleanPath =
      filteredPathParts.length > 0
        ? `${filteredPathParts.join("/")}/${cleanFileName}`
        : cleanFileName;
    const slug = cleanPath;

    return {
      ...document,
      mdx,
      slug,
      sectionFolder,
      isIndex,
      order,
      toc,
    };
  },
});

const legal = defineCollection({
  name: "legal",
  directory: "content/legal",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const templates = defineCollection({
  name: "templates",
  directory: "content/templates",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    targets: z.array(z.string()),
    banner: z.string().optional(),
    sections: z.array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      }),
    ),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const hooks = defineCollection({
  name: "hooks",
  directory: "content/hooks",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    name: z.string(),
    description: z.string(),
    args: z
      .array(
        z.object({
          name: z.string(),
          type_name: z.string(),
          description: z.string(),
          optional: z.boolean().default(false),
        }),
      )
      .optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const deeplinks = defineCollection({
  name: "deeplinks",
  directory: "content/deeplinks",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    path: z.string(),
    description: z.string().nullable(),
    params: z
      .array(
        z.object({
          name: z.string(),
          type_name: z.string(),
          description: z.string().nullable(),
        }),
      )
      .optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const vs = defineCollection({
  name: "vs",
  directory: "content/vs",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    name: z.string(),
    icon: z.string(),
    headline: z.string(),
    description: z.string(),
    metaDescription: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const integrations = defineCollection({
  name: "integrations",
  directory: "content/integrations",
  include: "**/*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    platform: z.string(),
    icon: z.string(),
    headline: z.string(),
    description: z.string(),
    metaDescription: z.string(),
    features: z.array(z.string()).optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const pathParts = document._meta.path.split("/");
    const fileName = pathParts.pop()!.replace(/\.mdx$/, "");
    const category = pathParts[0] || "general";
    const slug = fileName;

    return {
      ...document,
      mdx,
      slug,
      category,
    };
  },
});

const shortcuts = defineCollection({
  name: "shortcuts",
  directory: "content/shortcuts",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    prompt: z.string(),
    banner: z.string().optional(),
    targets: z.array(z.string()).optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const roadmap = defineCollection({
  name: "roadmap",
  directory: "content/roadmap",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    status: z.enum(["todo", "in-progress", "done"]),
    date: z.string(),
    labels: z.array(z.string()).optional(),
    priority: z.enum(["high", "mid", "low"]),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    const githubIssueRegex =
      /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+/g;
    const githubIssues = document.content.match(githubIssueRegex) || [];

    return {
      ...document,
      mdx,
      slug,
      githubIssues,
    };
  },
});

const ossFriends = defineCollection({
  name: "ossFriends",
  directory: "content/oss-friends",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    name: z.string(),
    description: z.string(),
    href: z.string(),
    image: z.string().optional(),
    github: z.string(),
  }),
  transform: async (document) => {
    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      slug,
    };
  },
});

const handbook = defineCollection({
  name: "handbook",
  directory: "content/handbook",
  include: "**/*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    section: z.string(),
    summary: z.string().optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const pathParts = document._meta.path.split("/");
    const fileName = pathParts.pop()!.replace(/\.mdx$/, "");

    const sectionFolder = pathParts[0] || "general";

    const isIndex = fileName === "index";

    const orderMatch = fileName.match(/^(\d+)\./);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 999;

    const cleanFileName = fileName.replace(/^\d+\./, "");
    const cleanPath =
      pathParts.length > 0
        ? `${pathParts.join("/")}/${cleanFileName}`
        : cleanFileName;
    const slug = cleanPath;

    return {
      ...document,
      mdx,
      slug,
      sectionFolder,
      isIndex,
      order,
      toc,
    };
  },
});

const jobs = defineCollection({
  name: "jobs",
  directory: "content/jobs",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    cardDescription: z.string(),
    backgroundImage: z.string(),
    applyUrl: z.string().optional(),
    published: z.boolean().default(true),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

export default defineConfig({
  collections: [
    articles,
    changelog,
    docs,
    legal,
    templates,
    shortcuts,
    hooks,
    deeplinks,
    vs,
    integrations,
    handbook,
    roadmap,
    ossFriends,
    jobs,
  ],
});
