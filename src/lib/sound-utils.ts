import { normalizeZipEntryPath } from "./zip-utils";
import { toPublicMediaPath } from "./media-url";

import type { SoundLean } from "./models/Sound";

type LeanDoc = Record<string, unknown> | SoundLean;

export function formatSound(doc: LeanDoc) {
  const { _id, categoryId, createdAt, updatedAt, ...rest } = doc;
  const fileName = typeof rest.fileName === "string" ? rest.fileName : undefined;
  const url = toPublicMediaPath(rest.url as string | undefined, { fileName, kind: "video", subdir: "wallpapers" }) ?? "";
  const thumbnailUrl = toPublicMediaPath(rest.thumbnailUrl as string | null | undefined, {
    fileName,
    kind: "thumbnail",
    subdir: "wallpapers",
  });

  return {
    id: String(_id),
    ...rest,
    url,
    thumbnailUrl,
    categoryId: categoryId ? String(categoryId) : null,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
  };
}

export function formatSounds(docs: LeanDoc[]) {
  return docs.map((doc) => formatSound(doc));
}

/** Lighter payload for list endpoints — omits description/tags. */
export function formatSoundListItem(doc: LeanDoc) {
  const formatted = formatSound(doc) as Record<string, unknown>;
  const { description: _d, tags: _t, ...summary } = formatted;
  return summary;
}

export function formatSoundList(docs: LeanDoc[]) {
  return docs.map((doc) => formatSoundListItem(doc));
}

export const SOUND_LIST_PROJECTION =
  "name url fileName fileSize format mimeType width height duration thumbnailUrl status order category categoryId createdAt updatedAt";

export function categorySlugFromZipPath(relativePath: string): string {
  const normalized = normalizeZipEntryPath(relativePath);
  const parts = normalized.split("/");
  if (parts.length <= 1) return "";
  return slugify(parts[0]);
}

export function categoryNameFromSlug(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const soundSort = { order: 1 as const, createdAt: 1 as const };
