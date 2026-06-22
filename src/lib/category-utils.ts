import { connectDB } from "./mongodb";
import { Category } from "./models";
import { categoryNameFromSlug } from "./sound-utils";

export { connectDB } from "./mongodb";

export async function getOrCreateCategory(slug: string) {
  await connectDB();
  if (!slug) return null;

  const existing = await Category.findOne({ slug }).lean();
  if (existing) return existing;

  const maxOrderResult = await Category.aggregate<{ maxOrder: number }>([
    { $group: { _id: null, maxOrder: { $max: "$order" } } },
  ]);
  const nextOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

  const created = await Category.create({
    name: categoryNameFromSlug(slug),
    slug,
    order: nextOrder,
  });

  return created.toObject();
}
