export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function getFormatFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase() || "UNKNOWN";
  return ext;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return "••••••••••••••••••••" + key.slice(-4);
}

export interface ApiJsonResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Safely parse JSON from a fetch Response; returns null on empty or invalid bodies. */
export async function safeJson<T = unknown>(response: Response): Promise<ApiJsonResponse<T> | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as ApiJsonResponse<T>;
  } catch {
    return null;
  }
}
