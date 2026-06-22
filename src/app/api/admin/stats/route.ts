import { connectDB } from "@/lib/mongodb";
import { Sound, Animation, Category, AppSettings } from "@/models";
import { runAdminRoute } from "@/lib/api-utils";
import { ensureAppSettings } from "@/lib/api-key";

export async function GET() {
  return runAdminRoute(async () => {
    await connectDB();
    await ensureAppSettings();

    const [
      totalWallpapers, publishedWallpapers, draftWallpapers, wallpaperStorage,
      totalAnimations, publishedAnimations, draftAnimations, animationStorage,
      totalCategories, settings
    ] = await Promise.all([
      Sound.countDocuments(),
      Sound.countDocuments({ status: "Published" }),
      Sound.countDocuments({ status: "Draft" }),
      Sound.aggregate<{ totalSize: number }>([
        { $group: { _id: null, totalSize: { $sum: "$fileSize" } } },
      ]),
      Animation.countDocuments(),
      Animation.countDocuments({ status: "Published" }),
      Animation.countDocuments({ status: "Draft" }),
      Animation.aggregate<{ totalSize: number }>([
        { $group: { _id: null, totalSize: { $sum: "$fileSize" } } },
      ]),
      Category.countDocuments(),
      AppSettings.findById("default").lean(),
    ]);

    const wpStorage = wallpaperStorage[0]?.totalSize || 0;
    const animStorage = animationStorage[0]?.totalSize || 0;

    return {
      totalWallpapers,
      publishedWallpapers,
      draftWallpapers,
      totalAnimations,
      publishedAnimations,
      draftAnimations,
      totalCategories,
      storageUsed: wpStorage + animStorage,
      wallpaperStorageUsed: wpStorage,
      animationStorageUsed: animStorage,
      apiStatus: "Active",
      totalApiRequests: settings?.totalRequests || 0,
    };
  });
}
