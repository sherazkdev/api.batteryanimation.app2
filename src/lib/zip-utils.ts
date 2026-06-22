import JSZip from "jszip";

const SKIP_PATTERNS = [
  /^__MACOSX\//i,
  /\/\./,
  /^\./,
  /\.DS_Store$/i,
  /Thumbs\.db$/i,
  /desktop\.ini$/i,
];

export const MAX_ZIP_ENTRIES = 500;

export function normalizeZipEntryPath(entryPath: string): string {
  return entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function shouldSkipZipEntry(entryPath: string): boolean {
  const normalized = normalizeZipEntryPath(entryPath);
  return SKIP_PATTERNS.some((p) => p.test(normalized));
}

export function zipEntryDisplayName(entryPath: string): string {
  return normalizeZipEntryPath(entryPath);
}

export function zipEntryBaseName(entryPath: string): string {
  const normalized = normalizeZipEntryPath(entryPath);
  return normalized.split("/").pop() || normalized;
}

export function nameFromZipPath(entryPath: string): string {
  const withoutExt = normalizeZipEntryPath(entryPath).replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/[/\\]/g, " ").replace(/[-_]+/g, " ").trim();
}

/** Top-level folder in ZIP path becomes category name (e.g. nature/loop.mp4 → nature) */
export function categoryFolderFromZipPath(entryPath: string): string {
  const normalized = normalizeZipEntryPath(entryPath);
  const parts = normalized.split("/");
  if (parts.length <= 1) return "general";
  return parts[0].trim() || "general";
}

export type ZipEntry = {
  relativePath: string;
  baseName: string;
  buffer: Buffer;
  isDirectory: boolean;
};

export async function loadZipEntries(buffer: Buffer): Promise<ZipEntry[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (err) {
    console.error("[zip] Failed to parse archive:", err);
    throw new Error("Invalid or corrupted ZIP file");
  }

  const fileEntries = Object.entries(zip.files).filter(([, entry]) => !entry.dir);
  if (fileEntries.length === 0) {
    throw new Error("ZIP contains no files");
  }

  if (fileEntries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`ZIP contains too many files (max ${MAX_ZIP_ENTRIES})`);
  }

  const entries: ZipEntry[] = [];

  for (const [rawPath, zipEntry] of fileEntries) {
    const relativePath = normalizeZipEntryPath(rawPath);
    if (!relativePath || shouldSkipZipEntry(relativePath)) continue;

    let content: Buffer;
    try {
      content = await zipEntry.async("nodebuffer");
    } catch (err) {
      console.error(`[zip] Failed to read entry ${relativePath}:`, err);
      continue;
    }

    if (content.length === 0) continue;

    entries.push({
      relativePath,
      baseName: zipEntryBaseName(relativePath),
      buffer: content,
      isDirectory: false,
    });
  }

  if (entries.length === 0) {
    throw new Error("ZIP contains no usable files");
  }

  return entries;
}
