import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export async function checkLocalProvider(
  providerId: string,
  baseUrl: string,
): Promise<boolean> {
  if (!baseUrl) return false;

  const headers: Record<string, string> = {};
  if (providerId === "ollama") {
    const host = baseUrl.replace(/\/v1\/?$/, "");
    headers["Origin"] = new URL(host).origin;
  }

  return Promise.race([
    tauriFetch(`${baseUrl}/models`, { headers })
      .then((r) => r.ok)
      .catch(() => false),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 2000)),
  ]);
}
