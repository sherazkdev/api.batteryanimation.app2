import { connectDB } from "./mongodb";
import { Sound } from "./models";

/** Reassign sequential order 1..n based on current order then createdAt */
export async function recompactWallpaperOrders() {
  await connectDB();
  const items = await Sound.find({})
    .sort({ order: 1, createdAt: 1 })
    .select("_id")
    .lean();

  if (items.length === 0) return 0;

  await Sound.bulkWrite(
    items.map((item, index) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { order: index + 1 } },
      },
    }))
  );

  return items.length;
}

/** Next available order number (appends to end) */
export async function getNextWallpaperOrder(): Promise<number> {
  await connectDB();
  const result = await Sound.aggregate<{ maxOrder: number }>([
    { $group: { _id: null, maxOrder: { $max: "$order" } } },
  ]);
  const max = result[0]?.maxOrder ?? 0;

  if (max === 0) {
    const count = await Sound.countDocuments();
    if (count > 0) {
      await recompactWallpaperOrders();
      const again = await Sound.aggregate<{ maxOrder: number }>([
        { $group: { _id: null, maxOrder: { $max: "$order" } } },
      ]);
      return (again[0]?.maxOrder ?? 0) + 1;
    }
  }

  return max + 1;
}

/** Apply a new global order from an array of IDs (position 0 = order 1) */
export async function applyWallpaperOrder(orderedIds: string[]) {
  if (orderedIds.length === 0) return;

  await connectDB();
  const existing = await Sound.find({}).select("_id").lean();
  const existingIds = new Set(existing.map((item) => String(item._id)));

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Invalid wallpaper id: ${id}`);
    }
  }

  if (orderedIds.length !== existing.length) {
    throw new Error("orderedIds must include every wallpaper");
  }

  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length) {
    throw new Error("Duplicate ids in orderedIds");
  }

  await Sound.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }))
  );
}

/** After deleting one or more items, recompact remaining orders */
export async function recompactAfterDelete() {
  return recompactWallpaperOrders();
}

export const wallpaperOrderBy = { order: 1 as const, createdAt: 1 as const };
