import { getGitHubCredentials } from "@/functions/github-content";

const GITHUB_REPO = "fastrepl/char";
const GITHUB_BRANCH = "main";
const IMAGES_PATH = "apps/web/public/images";

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  download_url: string | null;
}

export interface MediaItem {
  name: string;
  path: string;
  publicPath: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  downloadUrl: string | null;
}

function getPublicPath(fullPath: string): string {
  return fullPath.replace("apps/web/public", "");
}

function getFullPath(relativePath: string): string {
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.slice(1);
  }
  // Sanitize path traversal by removing any directory traversal sequences
  relativePath = relativePath.replace(/\.\.\//g, "");

  if (relativePath.startsWith("images")) {
    return `apps/web/public/${relativePath}`;
  }
  return `${IMAGES_PATH}/${relativePath}`;
}

export async function listMediaFiles(
  path: string = "",
): Promise<{ items: MediaItem[]; error?: string }> {
  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { items: [], error: "GitHub token not configured" };
  }
  const { token: githubToken } = credentials;

  const fullPath = path ? getFullPath(path) : IMAGES_PATH;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { items: [], error: "Folder not found" };
      }
      const error = await response.json();
      return {
        items: [],
        error: error.message || `GitHub API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as GitHubFile[];

    if (!Array.isArray(data)) {
      return { items: [], error: "Invalid response from GitHub API" };
    }

    const items: MediaItem[] = data.map((file) => ({
      name: file.name,
      path: file.path,
      publicPath: getPublicPath(file.path),
      sha: file.sha,
      size: file.size,
      type: file.type,
      downloadUrl: file.download_url,
    }));

    const folders = items.filter((item) => item.type === "dir");
    const files = items.filter((item) => item.type === "file");
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return { items: [...folders, ...files] };
  } catch (error) {
    return {
      items: [],
      error: `Failed to list files: ${(error as Error).message}`,
    };
  }
}

export async function uploadMediaFile(
  filename: string,
  content: string,
  folder: string = "",
): Promise<{
  success: boolean;
  path?: string;
  publicPath?: string;
  error?: string;
}> {
  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken } = credentials;

  const timestamp = Date.now();
  const sanitizedFilename = `${timestamp}-${filename
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .toLowerCase()}`;

  const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "svg",
    "webp",
    "avif",
  ];
  const ext = sanitizedFilename.toLowerCase().split(".").pop();

  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      success: false,
      error: "Invalid file type. Only images are allowed.",
    };
  }

  const fullFolder = folder ? getFullPath(folder) : IMAGES_PATH;
  const path = `${fullFolder}/${sanitizedFilename}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Upload ${sanitizedFilename} via Admin`,
          content,
          branch: GITHUB_BRANCH,
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

    return {
      success: true,
      path,
      publicPath: getPublicPath(path),
    };
  } catch (error) {
    return {
      success: false,
      error: `Upload failed: ${(error as Error).message}`,
    };
  }
}

export async function deleteMediaFiles(
  paths: string[],
): Promise<{ success: boolean; deleted: string[]; errors: string[] }> {
  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return {
      success: false,
      deleted: [],
      errors: ["GitHub token not configured"],
    };
  }
  const { token: githubToken } = credentials;

  const deleted: string[] = [];
  const errors: string[] = [];

  for (const path of paths) {
    const fullPath = path.startsWith("apps/web/") ? path : getFullPath(path);

    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (!getResponse.ok) {
        errors.push(
          `Failed to get file info for ${path}: ${getResponse.status}`,
        );
        continue;
      }

      const fileData = await getResponse.json();
      const sha = fileData.sha;

      const deleteResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `token ${githubToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            message: `Delete ${path} via Admin`,
            sha,
            branch: GITHUB_BRANCH,
          }),
        },
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        errors.push(
          `Failed to delete ${path}: ${error.message || deleteResponse.status}`,
        );
        continue;
      }

      deleted.push(path);
    } catch (error) {
      errors.push(`Failed to delete ${path}: ${(error as Error).message}`);
    }
  }

  return {
    success: errors.length === 0,
    deleted,
    errors,
  };
}

export async function createMediaFolder(
  folderName: string,
  parentFolder: string = "",
): Promise<{ success: boolean; path?: string; error?: string }> {
  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken } = credentials;

  const sanitizedFolderName = folderName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();
  const fullParent = parentFolder ? getFullPath(parentFolder) : IMAGES_PATH;
  const path = `${fullParent}/${sanitizedFolderName}/.gitkeep`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Create folder ${sanitizedFolderName} via Admin`,
          content: "",
          branch: GITHUB_BRANCH,
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

    return {
      success: true,
      path: `${fullParent}/${sanitizedFolderName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create folder: ${(error as Error).message}`,
    };
  }
}

export async function moveMediaFile(
  fromPath: string,
  toPath: string,
): Promise<{ success: boolean; newPath?: string; error?: string }> {
  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken } = credentials;

  const fullFromPath = fromPath.startsWith("apps/web/")
    ? fromPath
    : getFullPath(fromPath);
  const fullToPath = toPath.startsWith("apps/web/")
    ? toPath
    : getFullPath(toPath);

  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullFromPath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!getResponse.ok) {
      return {
        success: false,
        error: `Source file not found: ${getResponse.status}`,
      };
    }

    const fileData = await getResponse.json();
    const content = fileData.content;
    const sha = fileData.sha;

    const createResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullToPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Move ${fromPath} to ${toPath} via Admin`,
          content,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return {
        success: false,
        error: `Failed to create new file: ${error.message || createResponse.status}`,
      };
    }

    const deleteResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullFromPath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Move ${fromPath} to ${toPath} via Admin (delete original)`,
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!deleteResponse.ok) {
      return {
        success: false,
        error: "File copied but failed to delete original",
      };
    }

    return {
      success: true,
      newPath: fullToPath,
    };
  } catch (error) {
    return {
      success: false,
      error: `Move failed: ${(error as Error).message}`,
    };
  }
}
