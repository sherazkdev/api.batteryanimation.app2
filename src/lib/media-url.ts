const UPLOADS_PATH_RE = /\/uploads\/(.+)$/i;
const PUBLIC_UPLOADS_PATH_RE = /(?:^|\/)public\/uploads\/(.+)$/i;

function basenameWithoutExt(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() || fileName;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function extractUploadsPath(value: string): string | null {
  const normalized = value.replace(/\\/g, "/").split("?")[0];
  const match = normalized.match(UPLOADS_PATH_RE) || normalized.match(PUBLIC_UPLOADS_PATH_RE);
  if (!match) return null;
  return `/uploads/${match[1]}`;
}

export type MediaPathFallback = {
  fileName?: string;
  kind?: "video" | "thumbnail";
  subdir?: "wallpapers" | "animations";
};

function detectSubdir(fileName: string, defaultValue: "wallpapers" | "animations" = "wallpapers"): "wallpapers" | "animations" {
  const lower = fileName.toLowerCase();
  if (lower.includes("animations") || lower.includes("animation")) return "animations";
  if (lower.includes("wallpapers") || lower.includes("wallpaper")) return "wallpapers";
  return defaultValue;
}

/** Request origin from proxy or Host headers (optional dev/admin fallback). */
export function getRequestOrigin(headers: Headers): string | undefined {
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host");
  if (!host) return undefined;
  const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Base URL for absolute media links (public API, copy URL).
 * Priority: PUBLIC_BASE_URL → PUBLIC_API_BASE_URL → NEXT_PUBLIC_APP_URL → http://localhost:${PORT} → requestOrigin → window.origin
 */
export function getPublicBaseUrl(requestOrigin?: string): string {
  const explicit =
    process.env.PUBLIC_BASE_URL?.trim() ||
    process.env.PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return trimTrailingSlash(appUrl);

  const port = process.env.PORT?.trim();
  if (port) return `http://localhost:${port}`;

  if (requestOrigin?.trim()) return trimTrailingSlash(requestOrigin);

  if (typeof globalThis !== "undefined" && "window" in globalThis && globalThis.window?.location?.origin) {
    return trimTrailingSlash(globalThis.window.location.origin);
  }

  return "";
}

/** @deprecated Use getPublicBaseUrl — kept for existing imports during migration. */
export function getPublicApiBaseUrl(requestOrigin?: string): string {
  return getPublicBaseUrl(requestOrigin);
}

/** Join base URL and media path without duplicate slashes. Normalizes Windows `\` to `/`. */
export function toAbsoluteMediaUrl(path: string, baseUrl?: string): string {
  const normalized = path.replace(/\\/g, "/").trim();
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  const base = trimTrailingSlash(baseUrl ?? getPublicBaseUrl());
  if (!base) {
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  const relative = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${base}${relative}`;
}

/** Normalize stored or legacy URLs to relative `/uploads/...` paths for DB and internal use. */
export function normalizeStoredMediaPath(
  path: string | null | undefined,
  fallback?: MediaPathFallback
): string | null {
  return toPublicMediaPath(path, fallback);
}

/** Normalize stored or legacy URLs to same-origin `/uploads/...` paths. */
export function toPublicMediaPath(
  url: string | null | undefined,
  fallback?: MediaPathFallback
): string | null {
  if (url?.trim()) {
    const trimmed = url.trim();
    if (trimmed.startsWith("/uploads/")) return trimmed.replace(/\\/g, "/");

    const extracted = extractUploadsPath(trimmed);
    if (extracted) return extracted;

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const pathname = new URL(trimmed).pathname.replace(/\\/g, "/");
        if (pathname.startsWith("/uploads/")) return pathname;
        const fromPathname = extractUploadsPath(pathname);
        if (fromPathname) return fromPathname;
      } catch {
        // ignore invalid URLs
      }
    }
  }

  if (fallback?.fileName) {
    const sub = fallback.subdir || detectSubdir(fallback.fileName, "wallpapers");
    if (fallback.kind === "thumbnail") {
      return thumbnailPathFromFileName(fallback.fileName, sub);
    }
    return videoPathFromFileName(fallback.fileName, sub);
  }

  return null;
}

/**
 * Client/admin display base URL.
 * Priority: NEXT_PUBLIC_API_BASE_URL → NEXT_PUBLIC_APP_URL → browser origin
 */
export function getDisplayMediaBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  if (typeof globalThis !== "undefined" && "window" in globalThis && globalThis.window?.location?.origin) {
    return trimTrailingSlash(globalThis.window.location.origin);
  }

  return "";
}

/**
 * Relative path for admin dashboard preview (`<img>`, `<video>`).
 * Same-origin uses relative `/uploads/...`; cross-origin prepends NEXT_PUBLIC_API_BASE_URL.
 */
export function resolveMediaUrlForDisplay(
  url: string | null | undefined,
  fallback?: MediaPathFallback
): string | null {
  const normalized = toPublicMediaPath(url, fallback);
  if (!normalized) return null;

  if (typeof globalThis !== "undefined" && "window" in globalThis) {
    const base = getDisplayMediaBaseUrl();
    const origin = globalThis.window.location.origin;
    if (base && base !== origin) {
      return toAbsoluteMediaUrl(normalized, base);
    }
  }

  return normalized;
}

/**
 * Relative path for admin dashboard preview (`<img>`, `<video>`).
 * Normalizes legacy absolute URLs to `/uploads/...` so the browser resolves against the current origin.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  fallback?: MediaPathFallback
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  return resolveMediaUrlForDisplay(trimmed, fallback);
}

/**
 * Absolute URL for public API responses and copy-to-clipboard actions.
 * Uses PUBLIC_BASE_URL (or fallbacks); never double-prepends an already-absolute URL.
 */
export function getPublicMediaUrl(
  path: string | null | undefined,
  fallback?: MediaPathFallback,
  requestOrigin?: string
): string | null {
  const normalized = toPublicMediaPath(path, fallback);
  if (!normalized) return null;
  const base = getPublicBaseUrl(requestOrigin);
  if (!base) return normalized;
  return toAbsoluteMediaUrl(normalized, base);
}

/** Convert a stored media path to an absolute URL for API responses. */
export function resolveMediaUrlForApi(
  path: string | null | undefined,
  fallback?: MediaPathFallback,
  baseUrl?: string
): string | null {
  return getPublicMediaUrl(path, fallback, baseUrl);
}

/** @deprecated Use resolveMediaUrl — kept for existing imports during migration. */
export function resolveMediaUrlForClient(url: string | null | undefined): string | null {
  return resolveMediaUrl(url);
}

export function thumbnailPathFromFileName(fileName: string, subdir: "wallpapers" | "animations" = "wallpapers"): string {
  return `/uploads/thumbnails/${subdir}/${basenameWithoutExt(fileName)}.jpg`;
}

export function videoPathFromFileName(fileName: string, subdir: "wallpapers" | "animations" = "wallpapers"): string {
  const safeName = fileName.replace(/\\/g, "/").split("/").pop() || fileName;
  return `/uploads/${subdir}/${safeName}`;
}

/** Absolute URL for public API responses when request origin is known. */
export function resolveMediaUrlWithOrigin(
  url: string | null | undefined,
  origin: string,
  fallback?: MediaPathFallback
): string | null {
  return getPublicMediaUrl(url, fallback, origin);
}
