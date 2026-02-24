import type { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import { getSupabaseServerClient } from "@/functions/supabase";
import { uploadMediaFile } from "@/functions/supabase-media";

interface ImportRequest {
  url: string;
  title?: string;
  author?: string;
  description?: string;
  coverImage?: string;
  slug?: string;
}

interface ImageUploadResult {
  originalUrl: string;
  newUrl: string;
}

interface ImportResponse {
  success: boolean;
  mdx?: string;
  frontmatter?: Record<string, string | boolean>;
  error?: string;
}

interface ParsedGoogleDocsUrl {
  docId: string;
  tabParam: string | null;
}

function parseGoogleDocsUrl(url: string): ParsedGoogleDocsUrl | null {
  const docIdPatterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/document\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  let docId: string | null = null;
  for (const pattern of docIdPatterns) {
    const match = url.match(pattern);
    if (match) {
      docId = match[1];
      break;
    }
  }

  if (!docId) {
    return null;
  }

  let tabParam: string | null = null;
  try {
    const urlObj = new URL(url);
    const tabValue = urlObj.searchParams.get("tab");
    if (tabValue) {
      tabParam = tabValue;
    }
  } catch {
    const tabMatch = url.match(/[?&]tab=([^&#]+)/);
    if (tabMatch) {
      tabParam = tabMatch[1];
    }
  }

  return { docId, tabParam };
}

function htmlToMarkdown(html: string): string {
  let markdown = html;

  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  markdown = markdown.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  markdown = markdown.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  markdown = markdown.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  markdown = markdown.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  markdown = markdown.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "_$1_");
  markdown = markdown.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, "~~$1~~");
  markdown = markdown.replace(/<strike[^>]*>([\s\S]*?)<\/strike>/gi, "~~$1~~");
  markdown = markdown.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, "~~$1~~");

  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  markdown = markdown.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    "\n```\n$1\n```\n",
  );

  markdown = markdown.replace(
    /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  markdown = markdown.replace(
    /<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
    "![$2]($1)",
  );
  markdown = markdown.replace(
    /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi,
    "![$1]($2)",
  );
  markdown = markdown.replace(
    /<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi,
    "![]($1)",
  );

  markdown = markdown.replace(/<ul[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ul>/gi, "\n");
  markdown = markdown.replace(/<ol[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ol>/gi, "\n");
  markdown = markdown.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

  markdown = markdown.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, content) => {
      return content
        .split("\n")
        .map((line: string) => `> ${line}`)
        .join("\n");
    },
  );

  markdown = markdown.replace(/<hr[^>]*\/?>/gi, "\n---\n");

  markdown = markdown.replace(/<br[^>]*\/?>/gi, "\n");
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  markdown = markdown.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "\n$1\n");

  markdown = markdown.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, "$1");

  markdown = markdown.replace(
    /<table[^>]*>([\s\S]*?)<\/table>/gi,
    (_, tableContent) => {
      const rows: string[][] = [];
      const rowMatches = tableContent.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

      for (const row of rowMatches) {
        const cells: string[] = [];
        const cellMatches =
          row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        for (const cell of cellMatches) {
          const cellContent = cell
            .replace(/<t[dh][^>]*>/gi, "")
            .replace(/<\/t[dh]>/gi, "")
            .replace(/<[^>]+>/g, "")
            .replace(/\n/g, " ")
            .trim();
          cells.push(cellContent);
        }
        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length === 0) return "";

      const colCount = Math.max(...rows.map((r) => r.length));
      const normalizedRows = rows.map((r) => {
        while (r.length < colCount) r.push("");
        return r;
      });

      let mdTable = "\n";
      mdTable += "| " + normalizedRows[0].join(" | ") + " |\n";
      mdTable += "| " + normalizedRows[0].map(() => "---").join(" | ") + " |\n";
      for (let i = 1; i < normalizedRows.length; i++) {
        mdTable += "| " + normalizedRows[i].join(" | ") + " |\n";
      }
      return mdTable + "\n";
    },
  );

  markdown = markdown.replace(/<[^>]+>/g, "");

  markdown = markdown.replace(/&nbsp;/g, " ");
  markdown = markdown.replace(/&amp;/g, "&");
  markdown = markdown.replace(/&lt;/g, "<");
  markdown = markdown.replace(/&gt;/g, ">");
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");
  markdown = markdown.replace(/&rsquo;/g, "'");
  markdown = markdown.replace(/&lsquo;/g, "'");
  markdown = markdown.replace(/&rdquo;/g, '"');
  markdown = markdown.replace(/&ldquo;/g, '"');
  markdown = markdown.replace(/&mdash;/g, "—");
  markdown = markdown.replace(/&ndash;/g, "–");
  markdown = markdown.replace(/&hellip;/g, "...");

  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  markdown = markdown.trim();

  return markdown;
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    title = title.replace(/ - Google Docs$/, "");
    return title;
  }
  return null;
}

function removeTabTitleFromContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    return html;
  }

  let bodyContent = bodyMatch[1];

  const tabTitlePattern =
    /<p[^>]+class="[^"]*title[^"]*"[^>]*><span[^>]*>[^<]+<\/span><\/p>/gi;
  bodyContent = bodyContent.replace(tabTitlePattern, "");

  return html.replace(bodyMatch[1], bodyContent);
}

function generateMdx(
  content: string,
  options: {
    title: string;
    author: string;
    description: string;
    coverImage: string;
  },
): string {
  const today = new Date().toISOString().split("T")[0];

  const frontmatter = `---
meta_title: "${options.title}"
display_title: ""
meta_description: "${options.description}"
author: "${options.author}"
coverImage: "${options.coverImage}"
featured: false
published: false
date: "${today}"
---`;

  return `${frontmatter}\n\n${content}`;
}

function extractImageUrls(html: string): string[] {
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi;
  const urls: string[] = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (url && !url.startsWith("data:")) {
      urls.push(url);
    }
  }

  return [...new Set(urls)];
}

async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; mimeType: string; extension: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download image: ${url}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/avif": "avif",
    };

    const extension = extensionMap[contentType] || "png";

    return { buffer, mimeType: contentType, extension };
  } catch (error) {
    console.error(`Error downloading image: ${url}`, error);
    return null;
  }
}

async function uploadImagesToSupabase(
  supabase: SupabaseClient,
  imageUrls: string[],
  slug: string,
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = [];
  const folder = `articles/${slug}`;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const imageData = await downloadImage(url);

    if (!imageData) continue;

    const filename = `image-${i + 1}.${imageData.extension}`;
    const base64Content = imageData.buffer.toString("base64");

    const uploadResult = await uploadMediaFile(
      supabase,
      filename,
      base64Content,
      folder,
    );

    if (uploadResult.success && uploadResult.publicUrl) {
      results.push({
        originalUrl: url,
        newUrl: uploadResult.publicUrl,
      });
    }
  }

  return results;
}

function replaceImageUrls(
  markdown: string,
  imageReplacements: ImageUploadResult[],
): string {
  let result = markdown;

  for (const replacement of imageReplacements) {
    const escapedOriginal = replacement.originalUrl.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const regex = new RegExp(escapedOriginal, "g");
    result = result.replace(regex, replacement.newUrl);
  }

  return result;
}

export const Route = createFileRoute("/api/admin/import/google-docs")({
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

        const supabase = getSupabaseServerClient();

        try {
          const body: ImportRequest = await request.json();
          const { url, title, author, description, coverImage, slug } = body;

          if (!url) {
            return new Response(
              JSON.stringify({ success: false, error: "URL is required" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const parsedUrl = parseGoogleDocsUrl(url);
          if (!parsedUrl) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid Google Docs URL",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { docId, tabParam } = parsedUrl;
          const tabQueryParam = tabParam || "t.0";

          let html: string;
          let response: Response;

          const publishedUrl = `https://docs.google.com/document/d/${docId}/pub?tab=${tabQueryParam}`;
          response = await fetch(publishedUrl);

          if (!response.ok) {
            const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html&tab=${tabQueryParam}`;
            response = await fetch(exportUrl);

            if (!response.ok) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error:
                    "Failed to fetch document. Make sure it is either published to the web (File > Share > Publish to web) or shared with 'Anyone with the link can view' permissions.",
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
          }

          html = await response.text();

          html = removeTabTitleFromContent(html);
          const extractedTitle = extractTitle(html) || "Untitled";
          const finalTitle = title || extractedTitle;

          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1] : html;

          let markdown = htmlToMarkdown(bodyContent);

          const imageUrls = extractImageUrls(bodyContent);
          if (imageUrls.length > 0) {
            if (!slug) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "slug is required for image uploads",
                }),
                { status: 400 },
              );
            }

            const imageReplacements = await uploadImagesToSupabase(
              supabase,
              imageUrls,
              slug,
            );
            markdown = replaceImageUrls(markdown, imageReplacements);
          }

          const today = new Date().toISOString().split("T")[0];
          const finalAuthor = author || "Unknown";
          const finalDescription = description || "";

          const mdx = generateMdx(markdown, {
            title: finalTitle,
            author: finalAuthor,
            description: finalDescription,
            coverImage: coverImage || "",
          });

          const frontmatter = {
            meta_title: finalTitle,
            display_title: "",
            meta_description: finalDescription,
            author: finalAuthor,
            coverImage: coverImage || "",
            featured: false,
            published: false,
            date: today,
          };

          const result: ImportResponse = {
            success: true,
            mdx,
            frontmatter,
          };

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
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
