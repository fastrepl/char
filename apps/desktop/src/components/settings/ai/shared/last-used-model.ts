const STORAGE_KEY = "hypr:last_model";

function storageKey(type: "stt" | "llm", providerId: string): string {
  return `${STORAGE_KEY}:${type}:${providerId}`;
}

export function getLastUsedModel(
  type: "stt" | "llm",
  providerId: string,
): string | null {
  try {
    return localStorage.getItem(storageKey(type, providerId));
  } catch {
    return null;
  }
}

export function setLastUsedModel(
  type: "stt" | "llm",
  providerId: string,
  modelId: string,
): void {
  if (!modelId) {
    return;
  }
  try {
    localStorage.setItem(storageKey(type, providerId), modelId);
  } catch {}
}
