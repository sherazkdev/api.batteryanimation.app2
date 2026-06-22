import type { Types } from "mongoose";
import { getPublicMediaUrl, toPublicMediaPath } from "@/lib/media-url";

type PopulatedCategory = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  order: number;
};

type LeanAnimation = {
  _id: Types.ObjectId;
  name: string;
  url: string;
  fileName: string;
  fileSize: number;
  format: string;
  mimeType: string;
  width: number;
  height: number;
  duration: number;
  thumbnailUrl?: string | null;
  status: string;
  tags?: string | null;
  description?: string | null;
  order: number;
  categoryId?: Types.ObjectId | PopulatedCategory | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SerializeAnimationOptions = {
  requestOrigin?: string;
  /** When true (public `/api/v1/*`), url/thumbnailUrl are absolute. Admin APIs omit or set false. */
  absoluteMediaUrls?: boolean;
};

export function serializeCategory(doc: {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    order: doc.order,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}

function isPopulatedCategory(
  value: LeanAnimation["categoryId"]
): value is PopulatedCategory {
  return Boolean(value && typeof value === "object" && "name" in value && "_id" in value);
}

export function serializeAnimation(doc: LeanAnimation, options?: SerializeAnimationOptions) {
  const populatedCategory = isPopulatedCategory(doc.categoryId) ? doc.categoryId : null;

  const categoryId = populatedCategory
    ? populatedCategory._id.toString()
    : doc.categoryId
      ? doc.categoryId.toString()
      : null;

  const category = populatedCategory
    ? {
        id: populatedCategory._id.toString(),
        name: populatedCategory.name,
        slug: populatedCategory.slug,
        order: populatedCategory.order,
      }
    : null;

  const mediaFallback = { fileName: doc.fileName, subdir: "animations" as const };
  const requestOrigin = options?.requestOrigin;

  const url = options?.absoluteMediaUrls
    ? getPublicMediaUrl(doc.url, { ...mediaFallback, kind: "video" }, requestOrigin) ?? doc.url
    : toPublicMediaPath(doc.url, { ...mediaFallback, kind: "video" }) ?? doc.url;

  const thumbnailUrl = doc.thumbnailUrl?.trim()
    ? options?.absoluteMediaUrls
      ? getPublicMediaUrl(doc.thumbnailUrl, { ...mediaFallback, kind: "thumbnail" }, requestOrigin)
      : toPublicMediaPath(doc.thumbnailUrl, { ...mediaFallback, kind: "thumbnail" })
    : null;

  return {
    id: doc._id.toString(),
    name: doc.name,
    url,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    format: doc.format,
    mimeType: doc.mimeType,
    width: doc.width,
    height: doc.height,
    duration: doc.duration,
    thumbnailUrl,
    status: doc.status,
    tags: doc.tags ?? null,
    description: doc.description ?? null,
    order: doc.order,
    categoryId,
    category,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
