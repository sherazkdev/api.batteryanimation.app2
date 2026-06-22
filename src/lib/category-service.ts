import { connectMongoDB } from "@/lib/mongodb";
import { serializeCategory } from "@/lib/serialize";
import { Category } from "@/models/Category";
import { Animation } from "@/models/Animation";

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCategoryNameFromZipPath(zipPath: string): string | null {
  const normalized = zipPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return parts[0].trim() || null;
}

export async function getNextCategoryOrder(): Promise<number> {
  await connectMongoDB();
  const latest = await Category.findOne().sort({ order: -1 }).select("order").lean();
  return (latest?.order ?? 0) + 1;
}

export async function findOrCreateCategory(name: string) {
  await connectMongoDB();
  const trimmed = name.trim();
  const slug = slugifyCategoryName(trimmed);
  if (!slug) {
    throw new Error("Invalid category name");
  }

  const existing = await Category.findOne({ slug }).lean();
  if (existing) return serializeCategory(existing);

  const order = await getNextCategoryOrder();
  const created = await Category.create({ name: trimmed, slug, order });
  return serializeCategory(created.toObject());
}

export async function listCategories() {
  await connectMongoDB();
  const categories = await Category.find().sort({ order: 1 }).lean();
  const counts = await Animation.aggregate<{ _id: string; count: number }>([
    { $match: { categoryId: { $ne: null } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return categories.map((cat) => ({
    ...serializeCategory(cat),
    _count: { animations: countMap.get(cat._id.toString()) ?? 0 },
  }));
}
