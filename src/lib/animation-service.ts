import { connectMongoDB } from "@/lib/mongodb";
import { serializeAnimation, type SerializeAnimationOptions } from "@/lib/serialize";
import { toPublicMediaPath } from "@/lib/media-url";
import { Animation } from "@/models/Animation";
import { mediaDataFromUpload, type UploadedVideoResult } from "@/lib/upload";
import type { FilterQuery } from "mongoose";

const categoryPopulate = { path: "categoryId", select: "name slug order" };

export function buildListFilter(params: {
  search?: string;
  status?: string;
  format?: string;
  publishedOnly?: boolean;
  categoryId?: string;
}): FilterQuery<typeof Animation> {
  const filter: FilterQuery<typeof Animation> = {};
  if (params.publishedOnly) filter.status = "Published";
  if (params.status) filter.status = params.status;
  if (params.format) filter.format = params.format;
  if (params.categoryId) filter.categoryId = params.categoryId;
  if (params.search) {
    const regex = new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { fileName: regex }];
  }
  return filter;
}

export async function getNextOrder(): Promise<number> {
  await connectMongoDB();
  const latest = await Animation.findOne().sort({ order: -1 }).select("order").lean();
  return (latest?.order ?? 0) + 1;
}

export async function listAnimations(params: {
  // page: number;
  // limit: number;
  search?: string;
  status?: string;
  format?: string;
  categoryId?: string;
  publishedOnly?: boolean;
}, serializeOptions?: SerializeAnimationOptions) {
  await connectMongoDB();
  const filter = buildListFilter(params);
  // const skip = (params.page - 1) * params.limit;

  const [animations, total] = await Promise.all([
    Animation.find(filter)
      .sort({ order: 1 })
      // .skip(skip)
      // .limit(params.limit)
      .populate(categoryPopulate)
      .lean(),
    Animation.countDocuments(filter),
  ]);

  return {
    animations: animations.map((doc) => serializeAnimation(doc, serializeOptions)),
    total,
  };
}

export async function listAllAnimationIds(): Promise<string[]> {
  await connectMongoDB();
  const rows = await Animation.find().sort({ order: 1 }).select("_id").lean();
  return rows.map((r) => r._id.toString());
}

export async function createAnimationRecord(
  uploaded: UploadedVideoResult,
  extra: {
    name: string;
    status: string;
    tags?: string | null;
    description?: string | null;
    order?: number;
    categoryId?: string | null;
  },
  serializeOptions?: SerializeAnimationOptions
) {
  await connectMongoDB();
  const order = extra.order ?? (await getNextOrder());
  const media = mediaDataFromUpload(uploaded, extra);
  const created = await Animation.create({
    ...media,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    order,
    categoryId: extra.categoryId || null,
  });

  const populated = await Animation.findById(created._id).populate(categoryPopulate).lean();
  if (!populated) throw new Error("Failed to create animation");
  return serializeAnimation(populated, serializeOptions);
}

export async function reorderAnimations(orderedIds: string[]) {
  await connectMongoDB();
  const existing = await Animation.find().select("_id").lean();
  const existingIds = new Set(existing.map((e) => e._id.toString()));

  if (orderedIds.length !== existing.length) {
    throw new Error("Reorder payload must include all animation IDs");
  }

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Invalid animation ID: ${id}`);
    }
  }

  await Animation.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }))
  );
}

export async function compactOrdersAfterDelete() {
  await connectMongoDB();
  const items = await Animation.find().sort({ order: 1 }).select("_id").lean();
  await Animation.bulkWrite(
    items.map((item, index) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { order: index + 1 } },
      },
    }))
  );
}

export async function getAnimationCounts() {
  await connectMongoDB();
  const [total, published, draft] = await Promise.all([
    Animation.countDocuments(),
    Animation.countDocuments({ status: "Published" }),
    Animation.countDocuments({ status: "Draft" }),
  ]);
  return { total, published, draft };
}

export async function getAnimationStorageUsed(): Promise<number> {
  await connectMongoDB();
  const result = await Animation.aggregate<{ total: number }>([
    { $group: { _id: null, total: { $sum: "$fileSize" } } },
  ]);
  return result[0]?.total ?? 0;
}
